import React, { useState } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload';
import FilterBuilder from './FilterBuilder';
import DataTable from './DataTable';
import './ReferenceFileFilter.css';

function ReferenceFileFilter() {
  const [referenceData, setReferenceData] = useState(null);
  const [mainData, setMainData] = useState(null);
  const [keyColumn, setKeyColumn] = useState(null);
  const [filters, setFilters] = useState([]);
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReferenceFileUploaded = (data) => {
    setReferenceData(data);
    setFilters([]);
    setFilteredData(null);
  };

  const handleMainFileUploaded = (data) => {
    setMainData(data);
    setFilteredData(data.data);
    // Auto-detect key column
    if (referenceData) {
      autoDetectKeyColumn(referenceData, data);
    }
  };

  const autoDetectKeyColumn = (refData, mainData) => {
    const commonHeaders = refData.headers.filter(h => mainData.headers.includes(h));
    const keyColumnNames = ['id', 'code', 'key', 'name', 'number', 'no', 'ref', 'reference'];
    const detectedKey = commonHeaders.find(h => 
      keyColumnNames.some(key => h.toLowerCase().includes(key))
    );
    if (detectedKey) {
      setKeyColumn({ refColumn: detectedKey, primaryColumn: detectedKey });
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = async () => {
    if (!referenceData || !mainData) {
      alert('Please upload both Reference and Main files');
      return;
    }

    if (!keyColumn) {
      alert('Please select a matching column to link the files');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/reference-filter', {
        referenceData: referenceData.data,
        primaryData: mainData.data,
        keyColumns: [keyColumn],
        filterConditions: filters.length > 0
          ? filters.map(({ id, ...rest }) => rest)
          : null,
        joinType: 'inner',
        logicOperator: 'AND',
      });

      setFilteredData({
        headers: response.data.headers,
        data: response.data.data,
        totalRows: response.data.totalRows,
        originalPrimaryRows: response.data.originalPrimaryRows,
        filteredRefRows: response.data.filteredRefRows,
      });
    } catch (error) {
      alert('Failed to apply filters: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReferenceData(null);
    setMainData(null);
    setKeyColumn(null);
    setFilters([]);
    setFilteredData(null);
  };

  return (
    <div className="reference-file-filter">
      {!referenceData ? (
        <div className="upload-section">
          <h3>Step 1: Upload Reference File</h3>
          <p className="section-description">
            Upload the reference file that contains the data you want to filter by
          </p>
          <FileUpload onFileUploaded={handleReferenceFileUploaded} />
        </div>
      ) : !mainData ? (
        <div className="upload-section">
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={() => setReferenceData(null)}>
              ← Back
            </button>
            <div className="info-badge">
              Reference File: {referenceData.totalRows} rows loaded
            </div>
          </div>
          <h3>Step 2: Upload Main File</h3>
          <p className="section-description">
            Upload the main file that contains the data you want to output
          </p>
          <FileUpload onFileUploaded={handleMainFileUploaded} />
        </div>
      ) : (
        <>
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={reset}>
              Upload New Files
            </button>
            <div className="info-badge">
              Reference: {referenceData.totalRows} rows | 
              Main: {mainData.totalRows} rows | 
              Filtered: {filteredData?.totalRows || filteredData?.data?.length || filteredData?.length || 0} rows
            </div>
          </div>

          {!keyColumn && (
            <div className="section key-column-section">
              <h3>Link Files</h3>
              <p className="section-description">
                Select the column that matches between both files
              </p>
              <select
                className="key-select"
                onChange={(e) => {
                  const selectedCol = e.target.value;
                  if (selectedCol && referenceData.headers.includes(selectedCol) && mainData.headers.includes(selectedCol)) {
                    setKeyColumn({ refColumn: selectedCol, primaryColumn: selectedCol });
                  }
                }}
                value={keyColumn ? keyColumn.refColumn : ""}
              >
                <option value="">Select matching column...</option>
                {referenceData.headers
                  .filter(h => mainData.headers.includes(h))
                  .map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {keyColumn && (
            <>
              <div className="key-column-info">
                <span>Linked by: <strong>{keyColumn.refColumn}</strong></span>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => setKeyColumn(null)}
                >
                  Change
                </button>
              </div>

              <FilterBuilder
                headers={referenceData.headers}
                columnTypes={referenceData.columnTypes}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onApplyFilters={handleApplyFilters}
                data={filteredData}
                loading={loading}
              />

              {filteredData && (
                <DataTable
                  headers={filteredData.headers || mainData.headers}
                  data={Array.isArray(filteredData) ? filteredData : (filteredData.data || [])}
                  originalData={mainData.data}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ReferenceFileFilter;
