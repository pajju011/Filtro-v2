# Filtro - Excel Data Filtering Tool

A simple web application to filter and match Excel files with powerful filtering options.

## Features

- **Single File Filter**: Upload one Excel file and filter it with multiple conditions
- **Reference File Filter**: Upload two files, filter the reference file, and get matched results from both files
- Supports all Excel formats (.xls, .xlsx)
- Handles large files (up to 2GB)
- Export filtered data to Excel or PDF

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Run the Application

```bash
# Terminal 1 - Start Backend
cd backend
npm start

# Terminal 2 - Start Frontend
cd frontend
npm run dev
```

### 3. Open Browser

Go to `http://localhost:3000`

## How to Use

### Single File Filter

1. Click "Single File Filter" mode
2. Upload your Excel file
3. Add filter conditions (text, number, or date)
4. Click "Apply Filters"
5. View and export results

### Reference File Filter

1. Click "Reference File Filter" mode
2. Upload Reference File (file to filter by)
3. Upload Main File (file to get output from)
4. Select matching column to link files
5. Add filter conditions on Reference File
6. Click "Apply Filters"
7. View combined results from both files

## File Limits

- Maximum file size: **2GB**
- Supports millions of rows
- For very large files, use: `npm run start:prod` (8GB memory)

## Export Options

- Export to Excel (.xlsx)
- Export to PDF (limited to 1000 rows)

## Technology

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **File Processing**: xlsx, ExcelJS, PDFKit
