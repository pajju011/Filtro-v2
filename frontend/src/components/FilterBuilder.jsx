import React, { useState, useEffect } from 'react';
import './FilterBuilder.css';

const FILTER_CONDITIONS = {
  number: [
    { value: 'equals', label: 'Equals (=)' },
    { value: 'notEquals', label: 'Not Equals (≠)' },
    { value: 'greaterThan', label: 'Greater Than (>)' },
    { value: 'lessThan', label: 'Less Than (<)' },
    { value: 'greaterThanOrEqual', label: 'Greater Than or Equal (≥)' },
    { value: 'lessThanOrEqual', label: 'Less Than or Equal (≤)' },
    { value: 'between', label: 'Between' },
  ],
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'doesNotContain', label: 'Does Not Contain' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'exactMatch', label: 'Exact Match' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
  ],
  date: [
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'on', label: 'On' },
    { value: 'betweenDates', label: 'Between' },
  ],
};

function FilterBuilder({
  headers,
  columnTypes,
  filters,
  onFiltersChange,
  onApplyFilters,
  loading,
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const addFilter = () => {
    const newFilter = {
      id: Date.now(),
      column: headers[0] || '',
      condition: FILTER_CONDITIONS[columnTypes[headers[0]]]?.[0]?.value || 'equals',
      value: '',
      value2: '',
    };
    setLocalFilters([...localFilters, newFilter]);
    onFiltersChange([...localFilters, newFilter]);
  };

  const removeFilter = (id) => {
    const updated = localFilters.filter((f) => f.id !== id);
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const updateFilter = (id, field, value) => {
    const updated = localFilters.map((f) => {
      if (f.id === id) {
        const newFilter = { ...f, [field]: value };
        // Reset value2 when condition changes
        if (field === 'condition') {
          newFilter.value2 = '';
        }
        // Clear value for empty checks
        if (value === 'isEmpty' || value === 'isNotEmpty') {
          newFilter.value = '';
        }
        return newFilter;
      }
      return f;
    });
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleApply = () => {
    onApplyFilters();
  };

  const getConditionsForColumn = (column) => {
    const type = columnTypes[column] || 'text';
    return FILTER_CONDITIONS[type] || FILTER_CONDITIONS.text;
  };

  const needsSecondValue = (condition) => {
    return condition === 'between' || condition === 'betweenDates';
  };

  const needsValue = (condition) => {
    return condition !== 'isEmpty' && condition !== 'isNotEmpty';
  };

  const getInputType = (column, condition) => {
    if (!needsValue(condition)) return 'hidden';
    const type = columnTypes[column] || 'text';
    if (type === 'number') return 'number';
    if (type === 'date') return 'date';
    return 'text';
  };

  return (
    <div className="filter-builder">
      <div className="filter-header">
        <h2>Filter Conditions</h2>
        <button className="btn btn-primary" onClick={addFilter}>
          + Add Filter
        </button>
      </div>

      {localFilters.length === 0 ? (
        <div className="no-filters">
          <p>No filters applied. Click "Add Filter" to start filtering your data.</p>
        </div>
      ) : (
        <>
          <div className="filters-list">
            {localFilters.map((filter) => {
              const conditions = getConditionsForColumn(filter.column);
              const needsValue2 = needsSecondValue(filter.condition);
              const needsValueInput = needsValue(filter.condition);

              return (
                <div key={filter.id} className="filter-item">
                  <div className="filter-controls">
                    <select
                      className="filter-select"
                      value={filter.column}
                      onChange={(e) => updateFilter(filter.id, 'column', e.target.value)}
                    >
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header} ({columnTypes[header]})
                        </option>
                      ))}
                    </select>

                    <select
                      className="filter-select"
                      value={filter.condition}
                      onChange={(e) =>
                        updateFilter(filter.id, 'condition', e.target.value)
                      }
                    >
                      {getConditionsForColumn(filter.column).map((cond) => (
                        <option key={cond.value} value={cond.value}>
                          {cond.label}
                        </option>
                      ))}
                    </select>

                    {needsValueInput && (
                      <input
                        type={getInputType(filter.column, filter.condition)}
                        className="filter-input"
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) =>
                          updateFilter(filter.id, 'value', e.target.value)
                        }
                      />
                    )}

                    {needsValue2 && (
                      <input
                        type={getInputType(filter.column, filter.condition)}
                        className="filter-input"
                        placeholder="To"
                        value={filter.value2}
                        onChange={(e) =>
                          updateFilter(filter.id, 'value2', e.target.value)
                        }
                      />
                    )}

                    <button
                      className="btn btn-danger remove-btn"
                      onClick={() => removeFilter(filter.id)}
                      title="Remove filter"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="filter-actions">
            <button
              className="btn btn-success"
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? 'Applying Filters...' : 'Apply Filters'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setLocalFilters([]);
                onFiltersChange([]);
                onApplyFilters();
              }}
              disabled={loading}
            >
              Clear All
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default FilterBuilder;