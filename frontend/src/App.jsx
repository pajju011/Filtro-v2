import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FilterBuilder from './components/FilterBuilder';
import DataTable from './components/DataTable';
import ReferenceFileFilter from './components/ReferenceFileFilter';
import './App.css';

function App() {
  const [mode, setMode] = useState('single'); // 'single' or 'reference'
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
        <div className="app-header-top">
          <div>
            <h1>Filtro</h1>
            <p>
              Professional Excel filtering designed for analysts, operations teams, and decision
              makers.
            </p>
          </div>
          <span className="header-chip">Modern data workflow • Clean results • Fast decisions</span>
        </div>

        <div className="app-intro">
          <div className="intro-card">
            <strong>Instant filtering</strong>
            Refine large spreadsheets with advanced rules and export clean results.
          </div>
          <div className="intro-card">
            <strong>Reference matching</strong>
            Match related files and merge data with confidence.
          </div>
          <div className="intro-card">
            <strong>Export-ready</strong>
            Create polished Excel and PDF reports in seconds.
          </div>
        </div>
      </header>

      <div className="mode-switcher">
        <button
          className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => {
            setMode('single');
            setExcelData(null);
            setFilteredData(null);
            setFilters([]);
          }}
        >
          📊 Single File Filter
        </button>
        <button
          className={`mode-btn ${mode === 'reference' ? 'active' : ''}`}
          onClick={() => {
            setMode('reference');
            setExcelData(null);
            setFilteredData(null);
            setFilters([]);
          }}
        >
          🔗 Reference File Filter
        </button>
      </div>

      <div className="app-content">
        {mode === 'reference' ? (
          <ReferenceFileFilter />
        ) : !excelData ? (
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
                Original: {excelData.totalRows} rows | Filtered: {filteredData?.length || 0} rows
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

            {filteredData && <DataTable headers={excelData.headers} data={filteredData} />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
