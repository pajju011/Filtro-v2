import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FilterBuilder from './components/FilterBuilder';
import DataTable from './components/DataTable';
import './App.css';

function App() {
  const [excelData, setExcelData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUploaded = (data) => {
    setExcelData(data);
    setFilteredData(data.data);
    setFilters([]);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = async (data, filters) => {
    setLoading(true);
    try {
      const response = await fetch('/api/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, filters }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply filters');
      }

      const result = await response.json();
      setFilteredData(result.data);
    } catch (error) {
      console.error('Filter error:', error);
      alert('Failed to apply filters: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Filtro - Excel Data Filtering Tool</h1>
        <p>Upload Excel files and filter data with powerful conditions</p>
      </header>

      <div className="app-content">
        {!excelData ? (
          <FileUpload onFileUploaded={handleFileUploaded} />
        ) : (
          <>
            <div className="toolbar">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setExcelData(null);
                  setFilteredData(null);
                  setFilters([]);
                }}
              >
                Upload New File
              </button>
              <div className="info-badge">
                Original: {excelData.totalRows} rows | 
                Filtered: {filteredData?.length || 0} rows
              </div>
            </div>

            <FilterBuilder
              headers={excelData.headers}
              columnTypes={excelData.columnTypes}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onApplyFilters={() => handleApplyFilters(excelData.data, filters)}
              data={filteredData}
              loading={loading}
            />

            {filteredData && (
              <DataTable
                headers={excelData.headers}
                data={filteredData}
                originalData={excelData.data}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;