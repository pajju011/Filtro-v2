/**
 * Filtro Backend Server
 * Optimized for handling GB-sized datasets in production environments
 * 
 * For GB-sized files and very large datasets, use production mode:
 * npm run start:prod (uses 8GB memory)
 * 
 * Current limits:
 * - JSON payload: 2GB
 * - File upload: 2GB
 * - Supports pagination for filtering very large datasets
 * - Optimized for enterprise-level data processing
 */

import express from 'express';
import cors from 'cors';   
import multer from 'multer';                        
import XLSX from 'xlsx';                                                 
import ExcelJS from 'exceljs';                   
import PDFDocument from 'pdfkit';                     
import { fileURLToPath } from 'url'; 
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);           

const app = express();
const port = 3001;

// Middleware - Optimized for GB-sized datasets (Real-world production ready)
app.use(cors());
app.use(express.json({ limit: '2gb' })); // 2GB limit for very large JSON payloads
app.use(express.urlencoded({ limit: '2gb', extended: true }));

// Configure multer for file uploads - GB file support for enterprise datasets
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit for very large Excel files
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.endsWith('.xls') || 
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xls, .xlsx) are allowed'), false);
    }
  }
});

// Helper function to detect data type
function detectDataType(value) {
  if (value === null || value === undefined || value === '') {
    return 'text';
  }
  
  // Check if it's a date
  if (value instanceof Date) {
    return 'date';
  }
  
  // Check if it's a number
  if (typeof value === 'number') {
    return 'number';
  }
  
  // Check if string can be parsed as date
  const dateStr = String(value).trim();
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
    /^\d{4}\/\d{2}\/\d{2}$/
  ];
  
  if (datePatterns.some(pattern => pattern.test(dateStr))) {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return 'date';
    }
  }
  
  // Check if string is a number
  if (!isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value)) {
    return 'number';
  }
  
  return 'text';
}

// Helper function to parse Excel file - Optimized for GB-sized files
function parseExcel(buffer) {
  const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`Parsing Excel file: ${fileSizeMB} MB`);
  
  // For very large files, use optimized parsing options
  const parseOptions = {
    type: 'buffer',
    cellDates: true,
    dense: false, // Use sparse mode for memory efficiency
    sheetStubs: false // Skip empty cells
  };
  
  const workbook = XLSX.read(buffer, parseOptions);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row - optimized for large datasets
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    raw: false,
    defval: null,
    dateNF: 'yyyy-mm-dd',
    blankrows: false // Skip blank rows to save memory
  });
  
  if (data.length === 0) {
    throw new Error('Excel file is empty');
  }
  
  // Get headers
  const headers = Object.keys(data[0]);
  
  // Detect data types for each column - optimized sampling for large datasets
  const columnTypes = {};
  const sampleSize = Math.min(100, Math.floor(data.length / 10)); // Sample up to 100 rows
  
  headers.forEach(header => {
    const sampleValues = data.slice(0, sampleSize)
      .map(row => row[header])
      .filter(val => val !== null && val !== undefined && val !== '');
    
    if (sampleValues.length === 0) {
      columnTypes[header] = 'text';
    } else {
      // Count occurrences of each type
      const typeCounts = { text: 0, number: 0, date: 0 };
      sampleValues.forEach(val => {
        const type = detectDataType(val);
        typeCounts[type]++;
      });
      
      // Use the most common type
      columnTypes[header] = 
        typeCounts.number >= typeCounts.date && typeCounts.number >= typeCounts.text ? 'number' :
        typeCounts.date >= typeCounts.text ? 'date' : 'text';
    }
  });
  
  console.log(`Parsed ${data.length} rows with ${headers.length} columns`);
  
  return {
    headers,
    data,
    columnTypes,
    totalRows: data.length
  };
}

// Apply filters to data
function applyFilters(data, filters) {
  if (!filters || filters.length === 0) {
    return data;
  }
  
  return data.filter(row => {
    return filters.every(filter => {
      const { column, condition, value, value2 } = filter;
      const cellValue = row[column];
      const cellValueStr = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
      
      switch (condition) {
        // Numeric conditions
        case 'equals': {
          const num1 = parseFloat(cellValue);
          const num2 = parseFloat(value);
          return !isNaN(num1) && !isNaN(num2) && num1 === num2;
        }
        case 'notEquals': {
          const num1 = parseFloat(cellValue);
          const num2 = parseFloat(value);
          return isNaN(num1) || isNaN(num2) || num1 !== num2;
        }
        case 'greaterThan': {
          const num1 = parseFloat(cellValue);
          const num2 = parseFloat(value);
          return !isNaN(num1) && !isNaN(num2) && num1 > num2;
        }
        case 'lessThan': {
          const num1 = parseFloat(cellValue);
          const num2 = parseFloat(value);
          return !isNaN(num1) && !isNaN(num2) && num1 < num2;
        }
        case 'greaterThanOrEqual': {
          const num1 = parseFloat(cellValue);
          const num2 = parseFloat(value);
          return !isNaN(num1) && !isNaN(num2) && num1 >= num2;
        }
        case 'lessThanOrEqual': {
          const num1 = parseFloat(cellValue);
          const num2 = parseFloat(value);
          return !isNaN(num1) && !isNaN(num2) && num1 <= num2;
        }
        case 'between': {
          const num = parseFloat(cellValue);
          const num1 = parseFloat(value);
          const num2 = parseFloat(value2);
          return !isNaN(num) && !isNaN(num1) && !isNaN(num2) && 
                 num >= num1 && num <= num2;
        }
        
        // Text conditions
        case 'contains':
          return cellValueStr.toLowerCase().includes(String(value).toLowerCase());
        case 'doesNotContain':
          return !cellValueStr.toLowerCase().includes(String(value).toLowerCase());
        case 'startsWith':
          return cellValueStr.toLowerCase().startsWith(String(value).toLowerCase());
        case 'endsWith':
          return cellValueStr.toLowerCase().endsWith(String(value).toLowerCase());
        case 'exactMatch':
          return cellValueStr === String(value);
        
        // Date conditions
        case 'before': {
          const cellDate = new Date(cellValue);
          const filterDate = new Date(value);
          return !isNaN(cellDate.getTime()) && !isNaN(filterDate.getTime()) && 
                 cellDate < filterDate;
        }
        case 'after': {
          const cellDate = new Date(cellValue);
          const filterDate = new Date(value);
          return !isNaN(cellDate.getTime()) && !isNaN(filterDate.getTime()) && 
                 cellDate > filterDate;
        }
        case 'on': {
          const cellDate = new Date(cellValue);
          const filterDate = new Date(value);
          return !isNaN(cellDate.getTime()) && !isNaN(filterDate.getTime()) && 
                 cellDate.toDateString() === filterDate.toDateString();
        }
        case 'betweenDates': {
          const dateValue = new Date(cellValue);
          const date1 = new Date(value);
          const date2 = new Date(value2);
          return !isNaN(dateValue.getTime()) && !isNaN(date1.getTime()) && !isNaN(date2.getTime()) && 
                 dateValue >= date1 && dateValue <= date2;
        }
        
        // Empty checks
        case 'isEmpty':
          return cellValue === null || cellValue === undefined || cellValue === '' || cellValueStr.trim() === '';
        case 'isNotEmpty':
          return cellValue !== null && cellValue !== undefined && cellValue !== '' && cellValueStr.trim() !== '';
        
        default:
          return true;
      }
    });
  });
}

// Upload and parse Excel file - Optimized for large files
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Log file size for monitoring
    const fileSizeMB = (req.file.buffer.length / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (req.file.buffer.length / (1024 * 1024 * 1024)).toFixed(2);
    const sizeDisplay = parseFloat(fileSizeGB) >= 1 ? `${fileSizeGB} GB` : `${fileSizeMB} MB`;
    console.log(`Processing Excel file: ${req.file.originalname} (${sizeDisplay})`);
    
    // Check file size and warn for very large files
    if (req.file.buffer.length > 500 * 1024 * 1024) { // > 500MB
      console.warn(`Large file detected: ${sizeDisplay}. Processing may take time...`);
    }
    
    const parsed = parseExcel(req.file.buffer);
    
    // Log parsed data size
    console.log(`Successfully parsed ${parsed.totalRows.toLocaleString()} rows with ${parsed.headers.length} columns`);
    
    res.json(parsed);
  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific error types
    if (error.message && error.message.includes('heap')) {
      return res.status(413).json({ 
        error: 'File too large to process. Please split the file or reduce its size.' 
      });
    }
    
    if (error.message && error.message.includes('memory')) {
      return res.status(413).json({ 
        error: 'Insufficient memory to process file. Please use a smaller file.' 
      });
    }
    
    res.status(400).json({ error: error.message || 'Failed to parse Excel file' });
  }
});

// Apply filters with pagination support for large datasets
app.post('/api/filter', (req, res) => {
  try {
    const { data, filters, page, pageSize } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    // Apply filters
    const filteredData = applyFilters(data, filters);
    const totalRows = filteredData.length;
    const originalRows = data.length;
    
    // Pagination support for large datasets
    if (page !== undefined && pageSize !== undefined) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);
      
      return res.json({
        data: paginatedData,
        totalRows,
        originalRows,
        currentPage: page,
        totalPages: Math.ceil(totalRows / pageSize),
        hasMore: endIndex < totalRows
      });
    }
    
    // Return all data if no pagination requested
    res.json({ 
      data: filteredData,
      totalRows,
      originalRows
    });
  } catch (error) {
    console.error('Filter error:', error);
    
    // Handle memory errors specifically
    if (error.message && error.message.includes('heap')) {
      return res.status(413).json({ 
        error: 'Dataset too large to process. Please use pagination or reduce data size.' 
      });
    }
    
    res.status(400).json({ error: error.message || 'Failed to apply filters' });
  }
});

// Export to Excel - Optimized for large datasets with streaming
app.post('/api/export/excel', (req, res) => {
  try {
    const { data, headers, filename = 'filtered_data.xlsx' } = req.body;
    
    if (!data || !Array.isArray(data) || !headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    // Check data size and log for monitoring
    const rowCount = data.length;
    if (rowCount > 100000) {
      console.log(`Large dataset export: ${rowCount.toLocaleString()} rows`);
    }
    if (rowCount > 1000000) {
      console.warn(`Very large dataset export: ${rowCount.toLocaleString()} rows. This may take several minutes...`);
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Filtered Data');
    
    // Add headers
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Optimize: Add data in batches for GB-sized datasets
    // Larger batch size for better performance with very large datasets
    const BATCH_SIZE = rowCount > 1000000 ? 5000 : 1000;
    let processedRows = 0;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      batch.forEach(row => {
        const rowData = headers.map(header => {
          const value = row[header];
          // Handle large strings and null values
          if (value === null || value === undefined) return '';
          const strValue = String(value);
          // Truncate extremely long strings to prevent memory issues (Excel cell limit: 32,767 chars)
          return strValue.length > 32767 ? strValue.substring(0, 32767) : strValue;
        });
        worksheet.addRow(rowData);
      });
      
      processedRows += batch.length;
      // Log progress for very large exports
      if (rowCount > 500000 && processedRows % 100000 === 0) {
        console.log(`Export progress: ${processedRows.toLocaleString()} / ${rowCount.toLocaleString()} rows`);
      }
    }
    
    console.log(`Excel export completed: ${rowCount.toLocaleString()} rows`);
    
    // Auto-fit columns
    headers.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.min(30, Math.max(10, header.length + 2));
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the response for better memory efficiency
    workbook.xlsx.write(res).then(() => {
      res.end();
    }).catch((error) => {
      console.error('Excel export write error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to export Excel file. Dataset may be too large.' });
      }
    });
  } catch (error) {
    console.error('Excel export error:', error);
    
    // Handle memory errors
    if (error.message && (error.message.includes('heap') || error.message.includes('memory'))) {
      return res.status(413).json({ 
        error: 'Dataset too large to export. Please filter the data or export in smaller batches.' 
      });
    }
    
    res.status(500).json({ error: error.message || 'Failed to export Excel file' });
  }
});

// Export to PDF - Optimized for large datasets
app.post('/api/export/pdf', (req, res) => {
  try {
    const { data, headers, filename = 'filtered_data.pdf', maxRows = 1000 } = req.body;
    
    if (!data || !Array.isArray(data) || !headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    // Limit rows for PDF to prevent memory issues (configurable, default 1000)
    const rowsToExport = Math.min(data.length, maxRows);
    const exportData = data.slice(0, rowsToExport);
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).text('Filtered Data Report', { align: 'center' });
    doc.moveDown();
    
    // Add metadata
    doc.fontSize(10).text(`Total Rows: ${data.length} | Exported: ${rowsToExport}`, { align: 'center' });
    doc.moveDown();
    
    // Table
    const tableTop = doc.y;
    const rowHeight = 25;
    const colWidths = headers.map(() => 100);
    const pageWidth = doc.page.width - 100;
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const scale = pageWidth / totalWidth;
    const scaledWidths = colWidths.map(w => w * scale);
    
    // Header row
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, i) => {
      doc.rect(x, tableTop, scaledWidths[i], rowHeight).stroke();
      doc.text(header.substring(0, 15), x + 5, tableTop + 5, { width: scaledWidths[i] - 10, align: 'left' });
      x += scaledWidths[i];
    });
    
    // Data rows - optimized for large datasets
    doc.font('Helvetica');
    let y = tableTop + rowHeight;
    exportData.forEach((row, rowIndex) => {
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
      
      x = 50;
      headers.forEach((header, i) => {
        doc.rect(x, y, scaledWidths[i], rowHeight).stroke();
        const cellValue = row[header] !== null && row[header] !== undefined 
          ? String(row[header]).substring(0, 20) 
          : '';
        doc.text(cellValue, x + 5, y + 5, { width: scaledWidths[i] - 10, align: 'left' });
        x += scaledWidths[i];
      });
      y += rowHeight;
    });
    
    if (data.length > rowsToExport) {
      doc.moveDown();
      doc.text(`(Showing first ${rowsToExport} of ${data.length} rows. Use Excel export for full dataset.)`, { align: 'center' });
    }
    
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    
    // Handle memory errors
    if (error.message && (error.message.includes('heap') || error.message.includes('memory'))) {
      return res.status(413).json({ 
        error: 'Dataset too large to export as PDF. Please reduce the number of rows or use Excel export.' 
      });
    }
    
    res.status(500).json({ error: error.message || 'Failed to export PDF file' });
  }
});

// Reference File Filter - Professional filtering with join logic
app.post('/api/reference-filter', (req, res) => {
  try {
    const { 
      referenceData, 
      primaryData, 
      keyColumns, 
      filterConditions, 
      joinType = 'inner',
      logicOperator = 'AND',
      page,
      pageSize 
    } = req.body;
    
    // Validation
    if (!referenceData || !Array.isArray(referenceData) || referenceData.length === 0) {
      return res.status(400).json({ error: 'Reference data must be provided as a non-empty array' });
    }
    
    if (!primaryData || !Array.isArray(primaryData) || primaryData.length === 0) {
      return res.status(400).json({ error: 'Primary data must be provided as a non-empty array' });
    }
    
    if (!keyColumns || !Array.isArray(keyColumns) || keyColumns.length === 0) {
      return res.status(400).json({ error: 'At least one key column must be specified' });
    }
    
    // Validate key columns exist in both datasets
    if (referenceData.length === 0 || primaryData.length === 0) {
      return res.status(400).json({ error: 'Both datasets must contain at least one row' });
    }
    
    const refHeaders = Object.keys(referenceData[0]);
    const primaryHeaders = Object.keys(primaryData[0]);
    
    for (const keyCol of keyColumns) {
      if (!refHeaders.includes(keyCol.refColumn)) {
        return res.status(400).json({ error: `Reference column "${keyCol.refColumn}" not found` });
      }
      if (!primaryHeaders.includes(keyCol.primaryColumn)) {
        return res.status(400).json({ error: `Primary column "${keyCol.primaryColumn}" not found` });
      }
    }
    
    console.log(`Reference Filter: Ref(${referenceData.length} rows) + Primary(${primaryData.length} rows), Keys: ${keyColumns.length}, Join: ${joinType}`);
    
    // Step 1: Apply filters to Reference File
    let filteredReferenceData = referenceData;
    
    if (filterConditions && filterConditions.length > 0) {
      filteredReferenceData = applyFiltersWithLogic(referenceData, filterConditions, logicOperator);
      console.log(`After filtering: ${filteredReferenceData.length} reference rows`);
    }
    
    // Step 2: Create lookup map from filtered reference data
    const referenceMap = new Map();
    
    filteredReferenceData.forEach(refRow => {
      // Create composite key from all key columns
      const compositeKey = keyColumns.map(kc => {
        const value = refRow[kc.refColumn];
        return value !== null && value !== undefined ? String(value).toLowerCase().trim() : '';
      }).join('|||');
      
      if (!referenceMap.has(compositeKey)) {
        referenceMap.set(compositeKey, []);
      }
      referenceMap.get(compositeKey).push(refRow);
    });
    
    // Step 3: Join Primary File with filtered Reference File
    const joinedData = [];
    const matchedPrimaryKeys = new Set();
    
    primaryData.forEach(primaryRow => {
      // Create composite key from primary data
      const compositeKey = keyColumns.map(kc => {
        const value = primaryRow[kc.primaryColumn];
        return value !== null && value !== undefined ? String(value).toLowerCase().trim() : '';
      }).join('|||');
      
      const matchingRefRows = referenceMap.get(compositeKey);
      
      if (matchingRefRows && matchingRefRows.length > 0) {
        // Match found - handle one-to-many relationships
        // Merge reference and primary file data
        matchingRefRows.forEach(refRow => {
          const mergedRow = { ...primaryRow };
          // Add all reference file columns with prefix to avoid conflicts
          refHeaders.forEach(header => {
            if (primaryHeaders.includes(header)) {
              // If column exists in both, keep primary value but add reference with prefix
              mergedRow[`ref_${header}`] = refRow[header];
            } else {
              // If column only in reference, add it with prefix
              mergedRow[`ref_${header}`] = refRow[header];
            }
          });
          joinedData.push(mergedRow);
        });
        matchedPrimaryKeys.add(compositeKey);
      } else if (joinType === 'left') {
        // Left join - keep unmatched primary rows with null reference columns
        const mergedRow = { ...primaryRow };
        // Add null values for reference columns
        refHeaders.forEach(header => {
          if (!primaryHeaders.includes(header)) {
            mergedRow[`ref_${header}`] = null;
          } else {
            mergedRow[`ref_${header}`] = null;
          }
        });
        joinedData.push(mergedRow);
      }
    });
    
    const totalRows = joinedData.length;
    const originalPrimaryRows = primaryData.length;
    const filteredRefRows = filteredReferenceData.length;
    
    console.log(`Join completed: ${totalRows} rows (${joinType} join)`);
    
    // Return headers from both files (primary + reference with prefix)
    const allHeaders = [...primaryHeaders];
    refHeaders.forEach(header => {
      allHeaders.push(`ref_${header}`);
    });
    
    // Pagination support
    if (page !== undefined && pageSize !== undefined) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = joinedData.slice(startIndex, endIndex);
      
      return res.json({
        data: paginatedData,
        headers: allHeaders,
        totalRows,
        originalPrimaryRows,
        filteredRefRows,
        matchedRows: matchedPrimaryKeys.size,
        currentPage: page,
        totalPages: Math.ceil(totalRows / pageSize),
        hasMore: endIndex < totalRows
      });
    }
    
    // Return all data if no pagination
    res.json({
      data: joinedData,
      headers: allHeaders,
      totalRows,
      originalPrimaryRows,
      filteredRefRows,
      matchedRows: matchedPrimaryKeys.size
    });
  } catch (error) {
    console.error('Reference filter error:', error);
    
    if (error.message && error.message.includes('heap')) {
      return res.status(413).json({ 
        error: 'Dataset too large to process. Please use pagination or reduce data size.' 
      });
    }
    
    res.status(400).json({ error: error.message || 'Failed to apply reference filter' });
  }
});

// Helper function to apply filters with AND/OR logic
function applyFiltersWithLogic(data, filters, logicOperator = 'AND') {
  if (!filters || filters.length === 0) {
    return data;
  }
  
  if (logicOperator === 'OR') {
    // OR logic: row matches if ANY condition is true
    return data.filter(row => {
      return filters.some(filter => {
        return evaluateFilter(row, filter);
      });
    });
  } else {
    // AND logic: row matches if ALL conditions are true (default)
    return data.filter(row => {
      return filters.every(filter => {
        return evaluateFilter(row, filter);
      });
    });
  }
}

// Helper function to evaluate a single filter condition
function evaluateFilter(row, filter) {
  const { column, condition, value, value2 } = filter;
  const cellValue = row[column];
  const cellValueStr = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
  
  switch (condition) {
    // Numeric conditions
    case 'equals': {
      const num1 = parseFloat(cellValue);
      const num2 = parseFloat(value);
      return !isNaN(num1) && !isNaN(num2) && num1 === num2;
    }
    case 'notEquals': {
      const num1 = parseFloat(cellValue);
      const num2 = parseFloat(value);
      return isNaN(num1) || isNaN(num2) || num1 !== num2;
    }
    case 'greaterThan': {
      const num1 = parseFloat(cellValue);
      const num2 = parseFloat(value);
      return !isNaN(num1) && !isNaN(num2) && num1 > num2;
    }
    case 'lessThan': {
      const num1 = parseFloat(cellValue);
      const num2 = parseFloat(value);
      return !isNaN(num1) && !isNaN(num2) && num1 < num2;
    }
    case 'greaterThanOrEqual': {
      const num1 = parseFloat(cellValue);
      const num2 = parseFloat(value);
      return !isNaN(num1) && !isNaN(num2) && num1 >= num2;
    }
    case 'lessThanOrEqual': {
      const num1 = parseFloat(cellValue);
      const num2 = parseFloat(value);
      return !isNaN(num1) && !isNaN(num2) && num1 <= num2;
    }
    case 'between': {
      const num = parseFloat(cellValue);
      const num1 = parseFloat(value);
      const num2 = parseFloat(value2);
      return !isNaN(num) && !isNaN(num1) && !isNaN(num2) && 
             num >= num1 && num <= num2;
    }
    
    // Text conditions
    case 'contains':
      return cellValueStr.toLowerCase().includes(String(value).toLowerCase());
    case 'doesNotContain':
      return !cellValueStr.toLowerCase().includes(String(value).toLowerCase());
    case 'startsWith':
      return cellValueStr.toLowerCase().startsWith(String(value).toLowerCase());
    case 'endsWith':
      return cellValueStr.toLowerCase().endsWith(String(value).toLowerCase());
    case 'exactMatch':
      return cellValueStr === String(value);
    
    // Date conditions
    case 'before': {
      const cellDate = new Date(cellValue);
      const filterDate = new Date(value);
      return !isNaN(cellDate.getTime()) && !isNaN(filterDate.getTime()) && 
             cellDate < filterDate;
    }
    case 'after': {
      const cellDate = new Date(cellValue);
      const filterDate = new Date(value);
      return !isNaN(cellDate.getTime()) && !isNaN(filterDate.getTime()) && 
             cellDate > filterDate;
    }
    case 'on': {
      const cellDate = new Date(cellValue);
      const filterDate = new Date(value);
      return !isNaN(cellDate.getTime()) && !isNaN(filterDate.getTime()) && 
             cellDate.toDateString() === filterDate.toDateString();
    }
    case 'betweenDates': {
      const dateValue = new Date(cellValue);
      const date1 = new Date(value);
      const date2 = new Date(value2);
      return !isNaN(dateValue.getTime()) && !isNaN(date1.getTime()) && !isNaN(date2.getTime()) && 
             dateValue >= date1 && dateValue <= date2;
    }
    
    // Empty checks
    case 'isEmpty':
      return cellValue === null || cellValue === undefined || cellValue === '' || cellValueStr.trim() === '';
    case 'isNotEmpty':
      return cellValue !== null && cellValue !== undefined && cellValue !== '' && cellValueStr.trim() !== '';
    
    default:
      return true;
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});