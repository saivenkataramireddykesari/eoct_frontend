import { useState, useMemo, useCallback } from 'react';

export type ColumnAccessorMap<T> = {
  [columnKey: string]: (item: T) => any;
};

export interface ExcelSortState {
  columnKey: string | null;
  direction: 'asc' | 'desc' | null;
}

export interface ExcelFilterState {
  [columnKey: string]: Set<string> | null; // null or undefined means no filter (all selected)
}

export function useExcelTableFilter<T>(
  data: T[],
  columnAccessors: ColumnAccessorMap<T>
) {
  const [filterState, setFilterState] = useState<ExcelFilterState>({});
  const [sortState, setSortState] = useState<ExcelSortState>({ columnKey: null, direction: null });

  // Get distinct unique values for every column based on current `data`
  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.keys(columnAccessors).forEach((colKey) => {
      const accessor = columnAccessors[colKey];
      const set = new Set<string>();
      (data || []).forEach((row) => {
        const val = accessor(row);
        const strVal = val === null || val === undefined || val === '' ? '(Blanks)' : String(val);
        set.add(strVal);
      });
      map[colKey] = Array.from(set).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
    });
    return map;
  }, [data, columnAccessors]);

  // Compute filtered & sorted output
  const filteredAndSortedData = useMemo(() => {
    // 1. Filter rows
    let result = (data || []).filter((row) => {
      for (const colKey of Object.keys(filterState)) {
        const selectedSet = filterState[colKey];
        if (selectedSet !== null && selectedSet !== undefined) {
          const accessor = columnAccessors[colKey];
          if (!accessor) continue;
          const val = accessor(row);
          const strVal = val === null || val === undefined || val === '' ? '(Blanks)' : String(val);
          if (!selectedSet.has(strVal)) {
            return false;
          }
        }
      }
      return true;
    });

    // 2. Sort rows
    if (sortState.columnKey && sortState.direction) {
      const colKey = sortState.columnKey;
      const accessor = columnAccessors[colKey];
      const dirMultiplier = sortState.direction === 'asc' ? 1 : -1;

      result = [...result].sort((a, b) => {
        const rawA = accessor ? accessor(a) : '';
        const rawB = accessor ? accessor(b) : '';

        // Null / undefined handling
        if (rawA === rawB) return 0;
        if (rawA === null || rawA === undefined || rawA === '') return 1;
        if (rawB === null || rawB === undefined || rawB === '') return -1;

        // Number check
        const numA = Number(rawA);
        const numB = Number(rawB);
        if (!isNaN(numA) && !isNaN(numB) && typeof rawA !== 'boolean' && typeof rawB !== 'boolean') {
          return (numA - numB) * dirMultiplier;
        }

        // Date check
        const dateA = Date.parse(String(rawA));
        const dateB = Date.parse(String(rawB));
        if (!isNaN(dateA) && !isNaN(dateB) && typeof rawA === 'string' && rawA.includes('-') && typeof rawB === 'string' && rawB.includes('-')) {
          return (dateA - dateB) * dirMultiplier;
        }

        // String localeCompare
        const strA = String(rawA);
        const strB = String(rawB);
        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' }) * dirMultiplier;
      });
    }

    return result;
  }, [data, columnAccessors, filterState, sortState]);

  const setColumnFilter = useCallback((columnKey: string, selectedValues: Set<string> | null) => {
    setFilterState((prev) => {
      const next = { ...prev };
      if (!selectedValues) {
        delete next[columnKey];
      } else {
        next[columnKey] = selectedValues;
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((columnKey: string, direction: 'asc' | 'desc' | null) => {
    setSortState({ columnKey: direction ? columnKey : null, direction });
  }, []);

  const clearColumnFilter = useCallback((columnKey: string) => {
    setFilterState((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState({});
    setSortState({ columnKey: null, direction: null });
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filterState).filter(
      (k) => filterState[k] !== null && filterState[k] !== undefined
    ).length;
  }, [filterState]);

  return {
    filteredAndSortedData,
    filterState,
    sortState,
    uniqueValuesMap,
    setColumnFilter,
    handleSort,
    clearColumnFilter,
    clearAllFilters,
    activeFilterCount,
    isFiltered: activeFilterCount > 0 || sortState.direction !== null,
  };
}
