import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function DataTable({
  columns,
  data,
  keyField = '_id',
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange = null,
  onRowClick = null,
  
  // Server-side props
  serverSide = false,
  totalRecords = 0,
  currentPage = 1,
  limit = 10,
  totalPages = 1,
  onTableChange = null, // (params) => void
  onExport = null,      // () => void
  showFilters = false
}) {
  const allSelected = data.length > 0 && selectedRows.size === data.length;

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentLimit, setCurrentLimit] = useState(limit);

  // Trigger onTableChange when filters change (debounced for search)
  useEffect(() => {
    if (!serverSide || !onTableChange) return;
    const timeoutId = setTimeout(() => {
      onTableChange({
        page: currentPage,
        limit: currentLimit,
        search: searchQuery,
        startDate,
        endDate,
        sortField,
        sortOrder
      });
    }, 400); // 400ms debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, startDate, endDate, sortField, sortOrder, currentLimit, currentPage, serverSide]);

  const handleSort = (key) => {
    if (!serverSide) return;
    if (sortField === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortOrder('asc');
    }
    // reset to page 1 on sort change handled by parent or here? Better to let parent just receive the params.
    // Actually, usually changing sort goes to page 1, but we'll let parent handle that if needed, or we just pass it.
    if (onTableChange) {
      onTableChange({ page: 1, limit: currentLimit, search: searchQuery, startDate, endDate, sortField: key, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && onTableChange) {
      onTableChange({ page: newPage, limit: currentLimit, search: searchQuery, startDate, endDate, sortField, sortOrder });
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setCurrentLimit(newLimit);
    if (onTableChange) {
      onTableChange({ page: 1, limit: newLimit, search: searchQuery, startDate, endDate, sortField, sortOrder });
    }
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(item => item[keyField])));
    }
  };

  const toggleSelectRow = (id) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <div className="datatable-container">
      {/* --- Top Filters --- */}
      {showFilters && (
        <div className="datatable-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ position: 'relative', width: '250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
              />
            </div>
            
            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ paddingLeft: '32px', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ paddingLeft: '32px', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {onExport && (
            <button 
              type="button" 
              className="primary-btn" 
              onClick={onExport}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
            >
              <Download size={16} />
              Export Excel
            </button>
          )}
        </div>
      )}

      {/* --- Table --- */}
      <div className="table-responsive">
        <table className="preview-table">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: '44px', textAlign: 'center' }}>
                  <label className="trash-checkbox-wrap" style={{ justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      className="trash-checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                    <span className="trash-checkmark" />
                  </label>
                </th>
              )}
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  style={{ 
                    textAlign: col.align || 'left', 
                    width: col.width,
                    cursor: (serverSide && col.sortable !== false) ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}
                  onClick={() => (serverSide && col.sortable !== false) ? handleSort(col.key || col.label) : null}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                    {col.label}
                    {serverSide && col.sortable !== false && (
                      <span style={{ display: 'flex', alignItems: 'center', color: sortField === (col.key || col.label) ? 'var(--accent-primary)' : 'var(--text-muted)', opacity: sortField === (col.key || col.label) ? 1 : 0.4 }}>
                        {sortField === (col.key || col.label) ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No data available.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowKey = row[keyField] || idx;
                const isSelected = selectedRows.has(rowKey);
                return (
                  <tr 
                    key={rowKey} 
                    className={`${isSelected ? 'row-selected' : ''} ${row.rowClass || ''}`}
                    onClick={() => {
                      if (selectable && onSelectionChange) toggleSelectRow(rowKey);
                      if (onRowClick) onRowClick(row);
                    }}
                    style={{ cursor: (selectable || onRowClick) ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <label className="trash-checkbox-wrap" style={{ justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            className="trash-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(rowKey)}
                          />
                          <span className="trash-checkmark" />
                        </label>
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} style={{ textAlign: col.align || 'left' }}>
                        {col.render ? col.render(row, rowKey, idx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Pagination --- */}
      {serverSide && (
        <div className="datatable-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <span>Showing {data.length > 0 ? (currentPage - 1) * currentLimit + 1 : 0} to {Math.min(currentPage * currentLimit, totalRecords)} of {totalRecords} entries</span>
            <select 
              value={currentLimit} 
              onChange={handleLimitChange}
              style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 8px' }}
            >
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button" 
              className="icon-btn" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage <= 1 ? 'transparent' : 'var(--surface-color)', opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', padding: '0 8px' }}>
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <button 
              type="button" 
              className="icon-btn" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: currentPage >= totalPages ? 'transparent' : 'var(--surface-color)', opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-primary)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
