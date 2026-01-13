import React, { useState, useMemo } from 'react';
import axios from 'axios';
import './DataTable.css';

function DataTable({ headers, data, originalData }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [exporting, setExporting] = useState({ excel: false, pdf: false });

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Try to parse as numbers
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      const isNumeric = !isNaN(aNum) && !isNaN(bNum) && isFinite(aNum) && isFinite(bNum);

      if (isNumeric) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [data, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    setExporting({ ...exporting, excel: true });
    try {
      const response = await axios.post(
        '/api/export/excel',
        {
          data: sortedData,
          headers,
          filename: 'filtered_data.xlsx',
        },
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'filtered_data.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export Excel file: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting({ ...exporting, excel: false });
    }
  };

  const handleExportPDF = async () => {
    setExporting({ ...exporting, pdf: true });
    try {
      const response = await axios.post(
        '/api/export/pdf',
        {
          data: sortedData,
          headers,
          filename: 'filtered_data.pdf',
        },
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'filtered_data.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export PDF file: ' + (error.response?.data?.error || error.message));
    } finally {
      setExporting({ ...exporting, pdf: false });
    }
  };

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>Filtered Results</h2>
        <div className="export-buttons">
          <button
            className="btn btn-success"
            onClick={handleExportExcel}
            disabled={exporting.excel || sortedData.length === 0}
          >
            {exporting.excel ? 'Exporting...' : '📥 Export Excel'}
          </button>
          <button
            className="btn btn-success"
            onClick={handleExportPDF}
            disabled={exporting.pdf || sortedData.length === 0}
          >
            {exporting.pdf ? 'Exporting...' : '📄 Export PDF'}
          </button>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="no-data">
          <p>No data matches the current filters.</p>
        </div>
      ) : (
        <>
          <div className="table-controls">
            <label>
              Rows per page:
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rows-select"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={sortedData.length}>All ({sortedData.length})</option>
              </select>
            </label>
            <div className="pagination-info">
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, sortedData.length)} of{' '}
              {sortedData.length} rows
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      onClick={() => handleSort(header)}
                      className={sortColumn === header ? `sortable sorted-${sortDirection}` : 'sortable'}
                    >
                      {header}
                      {sortColumn === header && (
                        <span className="sort-icon">
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr key={index}>
                    {headers.map((header) => (
                      <td key={header}>
                        {row[header] !== null && row[header] !== undefined
                          ? String(row[header])
                          : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataTable;