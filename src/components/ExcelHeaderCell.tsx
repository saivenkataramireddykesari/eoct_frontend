import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

export interface ExcelHeaderCellProps {
  columnKey: string;
  label: string;
  uniqueValues?: string[];
  selectedValues?: Set<string> | null;
  sortDirection?: 'asc' | 'desc' | null;
  filterable?: boolean;
  sortable?: boolean;
  onFilterChange?: (selected: Set<string> | null) => void;
  onSortChange?: (direction: 'asc' | 'desc' | null) => void;
  onClearFilter?: () => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const ExcelHeaderCell: React.FC<ExcelHeaderCellProps> = ({
  columnKey,
  label,
  uniqueValues = [],
  selectedValues = null,
  sortDirection = null,
  filterable = true,
  sortable = true,
  onFilterChange,
  onSortChange,
  onClearFilter,
  align = 'left',
  className = '',
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const isFiltered = selectedValues !== null && selectedValues !== undefined;
  const isSorted = sortDirection !== null && sortDirection !== undefined;

  // Sync tempSelected when popup opens
  useEffect(() => {
    if (isOpen) {
      if (selectedValues) {
        setTempSelected(new Set(selectedValues));
      } else {
        setTempSelected(new Set(uniqueValues));
      }
      setSearchQuery('');
    }
  }, [isOpen, selectedValues, uniqueValues]);

  // Position popup relative to button position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 240;
      let left = rect.right - popupWidth;
      if (left < 10) left = rect.left;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }

      setPopupPos({
        top: rect.bottom + window.scrollY + 4,
        left: left + window.scrollX,
      });
    }
  }, [isOpen]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayedValues = uniqueValues.filter((v) =>
    v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllDisplayedSelected =
    displayedValues.length > 0 &&
    displayedValues.every((v) => tempSelected.has(v));

  const toggleSelectAll = () => {
    const next = new Set(tempSelected);
    if (isAllDisplayedSelected) {
      displayedValues.forEach((v) => next.delete(v));
    } else {
      displayedValues.forEach((v) => next.add(v));
    }
    setTempSelected(next);
  };

  const toggleItem = (val: string) => {
    const next = new Set(tempSelected);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setTempSelected(next);
  };

  const handleApply = () => {
    if (!onFilterChange) return;
    if (tempSelected.size === uniqueValues.length || tempSelected.size === 0) {
      onFilterChange(null);
    } else {
      onFilterChange(new Set(tempSelected));
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (onClearFilter) {
      onClearFilter();
    } else if (onFilterChange) {
      onFilterChange(null);
    }
    setIsOpen(false);
  };

  const handleSortClick = (dir: 'asc' | 'desc') => {
    if (!onSortChange) return;
    if (sortDirection === dir) {
      onSortChange(null);
    } else {
      onSortChange(dir);
    }
    setIsOpen(false);
  };

  return (
    <div
      className={`excel-header-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'space-between',
        gap: '6px',
        width: '100%',
        position: 'relative',
        userSelect: 'none',
        ...style,
      }}
    >
      <span className="excel-header-title">{label}</span>

      {(filterable || sortable) && (
        <button
          ref={buttonRef}
          type="button"
          className={`excel-filter-btn ${isFiltered || isSorted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          title={`Filter/Sort ${label}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill={isFiltered ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          {sortDirection === 'asc' && <span style={{ fontSize: '9px', marginLeft: '1px', fontWeight: 'bold' }}>▲</span>}
          {sortDirection === 'desc' && <span style={{ fontSize: '9px', marginLeft: '1px', fontWeight: 'bold' }}>▼</span>}
        </button>
      )}

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            className="excel-filter-popup"
            style={{
              top: `${popupPos.top}px`,
              left: `${popupPos.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sort Options */}
            {sortable && (
              <div className="excel-sort-group">
                <button
                  type="button"
                  className={`excel-sort-option ${sortDirection === 'asc' ? 'active' : ''}`}
                  onClick={() => handleSortClick('asc')}
                >
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>↑</span> Sort A to Z / Smallest
                </button>
                <button
                  type="button"
                  className={`excel-sort-option ${sortDirection === 'desc' ? 'active' : ''}`}
                  onClick={() => handleSortClick('desc')}
                >
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>↓</span> Sort Z to A / Largest
                </button>
              </div>
            )}

            {/* Clear Filter */}
            {filterable && (
              <button
                type="button"
                className="excel-clear-option"
                disabled={!isFiltered}
                onClick={handleClear}
              >
                <span>🚫</span> Clear Filter from "{label}"
              </button>
            )}

            <div className="excel-divider" />

            {/* Filter Section */}
            {filterable && (
              <>
                <div className="excel-search-container">
                  <input
                    type="text"
                    className="excel-filter-search"
                    placeholder="Search values..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="excel-filter-list">
                  <label className="excel-filter-item header-item">
                    <input
                      type="checkbox"
                      checked={isAllDisplayedSelected}
                      onChange={toggleSelectAll}
                    />
                    <span style={{ fontWeight: 600 }}>(Select All)</span>
                  </label>

                  {displayedValues.length === 0 ? (
                    <div style={{ padding: '8px', color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>
                      No matches found
                    </div>
                  ) : (
                    displayedValues.map((val) => (
                      <label key={val} className="excel-filter-item">
                        <input
                          type="checkbox"
                          checked={tempSelected.has(val)}
                          onChange={() => toggleItem(val)}
                        />
                        <span title={val}>{val}</span>
                      </label>
                    ))
                  )}
                </div>

                <div className="excel-popup-footer">
                  <button type="button" className="excel-btn-apply" onClick={handleApply}>
                    OK
                  </button>
                  <button type="button" className="excel-btn-cancel" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export interface ExcelActiveFiltersBarProps {
  activeCount: number;
  isSorted?: boolean;
  onClearAll: () => void;
}

export const ExcelActiveFiltersBar: React.FC<ExcelActiveFiltersBarProps> = ({
  activeCount,
  isSorted,
  onClearAll,
}) => {
  if (activeCount === 0 && !isSorted) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        padding: '6px 12px',
        marginBottom: '12px',
        fontSize: '13px',
        color: '#1e40af',
      }}
    >
      <span>
        ⚡ Column filter active: <strong>{activeCount}</strong> column(s) filtered{isSorted ? ' & table sorted' : ''}.
      </span>
      <button
        type="button"
        onClick={onClearAll}
        style={{
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '3px 10px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Clear All Column Filters
      </button>
    </div>
  );
};
