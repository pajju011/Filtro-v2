# Filtro - Excel Data Filtering Tool

A professional, user-friendly web application that allows users to upload Excel files (.xls or .xlsx) and filter data using comprehensive filtering conditions. The system automatically detects column headers and data types (text, number, date) from uploaded files and provides an intuitive filtering interface.

## Features

### Core Functionality
- **Excel File Upload**: Supports both .xls and .xlsx formats (up to 10MB)
- **Automatic Data Type Detection**: Automatically identifies text, number, and date columns
- **Dynamic Filter Builder**: Add, remove, and modify multiple filter conditions
- **Comprehensive Filter Types**:
  - **Numeric**: Equals, Not Equals, Greater Than, Less Than, Greater/Equal, Less/Equal, Between
  - **Text**: Contains, Does Not Contain, Starts With, Ends With, Exact Match, Is Empty, Is Not Empty
  - **Date**: Before, After, On, Between
- **Real-time Filtering**: Apply multiple conditions simultaneously
- **Data Table Display**: View filtered results in a sortable, paginated table
- **Export Options**: Download filtered data as Excel (.xlsx) or PDF files

### User Experience
- Modern, responsive design with intuitive UI
- Drag-and-drop file upload
- Column sorting in the results table
- Pagination controls
- Real-time row count display
- Professional gradient styling

## Technology Stack

### Backend
- **Node.js** with Express.js
- **xlsx** - Excel file parsing
- **ExcelJS** - Excel file generation
- **PDFKit** - PDF file generation
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **CSS3** - Modern styling with gradients and animations

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository** (or navigate to the project directory)

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## Running the Application

### Development Mode

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   ```
   The backend server will run on `http://localhost:3001`

2. **Start the Frontend Development Server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend application will run on `http://localhost:3000`

3. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

### Production Build

1. **Build the Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the Backend** (which can serve the built frontend in production)
   ```bash
   cd backend
   npm start
   ```

## Usage Guide

### Uploading a File
1. Click "Browse Files" or drag and drop an Excel file onto the upload area
2. Supported formats: .xls and .xlsx
3. Maximum file size: 10MB
4. The system will automatically parse the file and detect column types

### Adding Filters
1. Click "Add Filter" to create a new filter condition
2. Select a column from the dropdown (column type is shown in parentheses)
3. Choose a filter condition based on the column type
4. Enter the filter value(s)
5. Add multiple filters as needed (all filters are combined with AND logic)
6. Click "Apply Filters" to filter the data

### Viewing Results
- Filtered results are displayed in a sortable table
- Click column headers to sort
- Use pagination controls to navigate through large datasets
- Adjust rows per page using the dropdown

### Exporting Data
- Click "Export Excel" to download filtered data as .xlsx file
- Click "Export PDF" to download filtered data as PDF file (limited to first 50 rows)

### Clearing Filters
- Click "Clear All" to remove all filters and show original data
- Click the "✕" button on individual filters to remove them
- Click "Upload New File" to start over with a different file

## API Endpoints

### POST /api/upload
Upload and parse an Excel file.
- **Request**: multipart/form-data with 'file' field
- **Response**: JSON with headers, data, columnTypes, and totalRows

### POST /api/filter
Apply filters to data.
- **Request**: JSON with `data` (array) and `filters` (array)
- **Response**: JSON with filtered `data`, `totalRows`, and `originalRows`

### POST /api/export/excel
Export filtered data to Excel.
- **Request**: JSON with `data`, `headers`, and optional `filename`
- **Response**: Excel file download

### POST /api/export/pdf
Export filtered data to PDF.
- **Request**: JSON with `data`, `headers`, and optional `filename`
- **Response**: PDF file download

## Project Structure

```
qac/
├── backend/
│   ├── server.js          # Express server and API endpoints
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx      # File upload component
│   │   │   ├── FileUpload.css
│   │   │   ├── FilterBuilder.jsx   # Dynamic filter builder
│   │   │   ├── FilterBuilder.css
│   │   │   ├── DataTable.jsx       # Results table component
│   │   │   └── DataTable.css
│   │   ├── App.jsx        # Main application component
│   │   ├── App.css        # Main application styles
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── index.html
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
└── README.md
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.