import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './FileUpload.css';

function FileUpload({ onFileUploaded }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setError('Please upload a valid Excel file (.xlsx)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onFileUploaded(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
            accept=".xlsx"
        />

        {uploading ? (
          <div className="upload-status">
            <div className="spinner"></div>
            <p>Processing Excel file...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📊</div>
            <h3>Drop your Excel file here</h3>
            <p>or</p>
            <label htmlFor="file-upload" className="btn btn-primary">
              Browse Files
            </label>
            <p className="file-info">Supports .xlsx files only (max 10MB)</p>
          </>
        )}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

FileUpload.propTypes = {
  onFileUploaded: PropTypes.func.isRequired,
};

export default FileUpload;
