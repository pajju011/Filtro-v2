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

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Helper function to parse Excel file
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    raw: false,
    defval: null,
    dateNF: 'yyyy-mm-dd'
  });
  
  if (data.length === 0) {
    throw new Error('Excel file is empty');
  }
  
  // Get headers
  const headers = Object.keys(data[0]);
  
  // Detect data types for each column
  const columnTypes = {};
  headers.forEach(header => {
    const sampleValues = data.slice(0, Math.min(10, data.length))
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

// Upload and parse Excel file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const parsed = parseExcel(req.file.buffer);
    res.json(parsed);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message || 'Failed to parse Excel file' });
  }
});

// Apply filters
app.post('/api/filter', (req, res) => {
  try {
    const { data, filters } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    const filteredData = applyFilters(data, filters);
    res.json({ 
      data: filteredData,
      totalRows: filteredData.length,
      originalRows: data.length
    });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(400).json({ error: error.message || 'Failed to apply filters' });
  }
});

// Export to Excel
app.post('/api/export/excel', (req, res) => {
  try {
    const { data, headers, filename = 'filtered_data.xlsx' } = req.body;
    
    if (!data || !Array.isArray(data) || !headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Invalid data provided' });
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
    
    // Add data
    data.forEach(row => {
      const rowData = headers.map(header => row[header] || '');
      worksheet.addRow(rowData);
    });
    
    // Auto-fit columns
    headers.forEach((header, index) => {
      worksheet.getColumn(index + 1).width = 15;
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    workbook.xlsx.write(res).then(() => {
      res.end();
    }).catch((error) => {
      console.error('Excel export write error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to export Excel file' });
      }
    });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export Excel file' });
  }
});

// Export to PDF
app.post('/api/export/pdf', (req, res) => {
  try {
    const { data, headers, filename = 'filtered_data.pdf' } = req.body;
    
    if (!data || !Array.isArray(data) || !headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).text('Filtered Data Report', { align: 'center' });
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
    
    // Data rows
    doc.font('Helvetica');
    let y = tableTop + rowHeight;
    data.slice(0, 50).forEach((row, rowIndex) => { // Limit to 50 rows for PDF
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
      
      x = 50;
      headers.forEach((header, i) => {
        doc.rect(x, y, scaledWidths[i], rowHeight).stroke();
        const cellValue = row[header] !== null && row[header] !== undefined ? String(row[header]).substring(0, 20) : '';
        doc.text(cellValue, x + 5, y + 5, { width: scaledWidths[i] - 10, align: 'left' });
        x += scaledWidths[i];
      });
      y += rowHeight;
    });
    
    if (data.length > 50) {
      doc.moveDown();
      doc.text(`(Showing first 50 of ${data.length} rows)`, { align: 'center' });
    }
    
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export PDF file' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});