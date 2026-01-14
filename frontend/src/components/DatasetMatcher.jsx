import React, { useState } from 'react';
import axios from 'axios';
import DataTable from './DataTable';
import './DatasetMatcher.css';

function DatasetMatcher() {
  const [mainFile, setMainFile] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [mainData, setMainData] = useState(null);
  const [referenceData, setReferenceData] = useState(null);
  const [matchConditions, setMatchConditions] = useState([]);
  const [matchedData, setMatchedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ main: false, reference: false });

  const handleFileUpload = async (file, type) => {
    if (!file || (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx'))) {
      alert('Please upload a valid Excel file (.xls or .xlsx)');
      return;
    }

    setUploading({ ...uploading, [type]: true });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (type === 'main') {
        setMainFile(file);
        setMainData(response.data);
      } else {
        setReferenceFile(file);
        setReferenceData(response.data);
      }
    } catch (error) {
      alert('Failed to upload file: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  };

  const addMatchCondition = () => {
    if (!mainData || !referenceData) {
      alert('Please upload both datasets first');
      return;
    }

    const newCondition = {
      id: Date.now(),
      mainColumn: mainData.headers[0] || '',
      referenceColumn: referenceData.headers[0] || '',
      matchType: 'exact',
    };

    setMatchConditions([...matchConditions, newCondition]);
  };

  const removeMatchCondition = (id) => {
    setMatchConditions(matchConditions.filter(c => c.id !== id));
  };

  const updateMatchCondition = (id, field, value) => {
    setMatchConditions(
      matchConditions.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const handleMatch = async () => {
    if (!mainData || !referenceData) {
      alert('Please upload both datasets');
      return;
    }

    if (matchConditions.length === 0) {
      alert('Please add at least one match condition');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/match', {
        mainData: mainData.data,
        referenceData: referenceData.data,
        matchConditions: matchConditions.map(({ id, ...rest }) => rest),
      });

      setMatchedData({
        headers: mainData.headers,
        data: response.data.data,
        totalRows: response.data.totalRows,
        originalRows: response.data.originalRows,
        referenceRows: response.data.referenceRows,
      });
    } catch (error) {
      alert('Failed to match datasets: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMainFile(null);
    setReferenceFile(null);
    setMainData(null);
    setReferenceData(null);
    setMatchConditions([]);
    setMatchedData(null);
  };

  return (
    <div className="dataset-matcher">
      <div className="matcher-header">
        <h2>Dataset Matching</h2>
        <p>Upload a large main dataset and a small reference dataset to extract matching rows</p>
      </div>

      <div className="upload-section">
        <div className="upload-box">
          <h3>Main Dataset (Large)</h3>
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => handleFileUpload(e.target.files[0], 'main')}
            disabled={uploading.main}
          />
          {mainData && (
            <div className="file-info">
              <strong>✓ Loaded:</strong> {mainData.totalRows.toLocaleString()} rows, {mainData.headers.length} columns
            </div>
          )}
          {uploading.main && <div className="uploading-indicator">Uploading...</div>}
        </div>

        <div className="upload-box">
          <h3>Reference Dataset (Small)</h3>
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => handleFileUpload(e.target.files[0], 'reference')}
            disabled={uploading.reference}
          />
          {referenceData && (
            <div className="file-info">
              <strong>✓ Loaded:</strong> {referenceData.totalRows.toLocaleString()} rows, {referenceData.headers.length} columns
            </div>
          )}
          {uploading.reference && <div className="uploading-indicator">Uploading...</div>}
        </div>
      </div>

      {mainData && referenceData && (
        <div className="match-conditions">
          <div className="conditions-header">
            <h3>Match Conditions</h3>
            <button className="btn btn-primary" onClick={addMatchCondition}>
              + Add Condition
            </button>
          </div>

          {matchConditions.length === 0 ? (
            <p className="no-conditions">Click "Add Condition" to specify how to match the datasets</p>
          ) : (
            matchConditions.map((condition) => (
              <div key={condition.id} className="match-condition">
                <select
                  value={condition.mainColumn}
                  onChange={(e) => updateMatchCondition(condition.id, 'mainColumn', e.target.value)}
                >
                  {mainData.headers.map((header) => (
                    <option key={header} value={header}>
                      Main: {header}
                    </option>
                  ))}
                </select>

                <select
                  value={condition.matchType}
                  onChange={(e) => updateMatchCondition(condition.id, 'matchType', e.target.value)}
                >
                  <option value="exact">Exact Match</option>
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts With</option>
                  <option value="endsWith">Ends With</option>
                </select>

                <select
                  value={condition.referenceColumn}
                  onChange={(e) => updateMatchCondition(condition.id, 'referenceColumn', e.target.value)}
                >
                  {referenceData.headers.map((header) => (
                    <option key={header} value={header}>
                      Reference: {header}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-danger btn-small"
                  onClick={() => removeMatchCondition(condition.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}

          <div className="match-actions">
            <button
              className="btn btn-success btn-large"
              onClick={handleMatch}
              disabled={loading || matchConditions.length === 0}
            >
              {loading ? 'Matching...' : 'Match & Extract Data'}
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      )}

      {matchedData && (
        <div className="matched-results">
          <div className="results-header">
            <h3>Matched Results</h3>
            <div className="results-stats">
              <span>Original: {matchedData.originalRows.toLocaleString()} rows</span>
              <span>Reference: {matchedData.referenceRows.toLocaleString()} rows</span>
              <span className="highlight">Matched: {matchedData.totalRows.toLocaleString()} rows</span>
            </div>
          </div>
          <DataTable
            headers={matchedData.headers}
            data={matchedData.data}
            originalData={matchedData.data}
          />
        </div>
      )}
    </div>
  );
}

export default DatasetMatcher;
