import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

export interface EnhancedColumn {
  title: string;
  dataIndex?: string;
  key: string;
  width?: number;
  resizable?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  render?: (text: any, record: any, index: number) => React.ReactNode;
  fixed?: 'left' | 'right';
  align?: 'left' | 'right' | 'center';
  sorter?: any;
  filters?: any;
  filterDropdown?: any;
  filterIcon?: any;
  onFilter?: any;
  [key: string]: any;
}

export function useTableEnhance(
  baseColumns: EnhancedColumn[],
  dataSource: any[],
  options?: { minWidth?: number; maxWidth?: number }
) {
  const minWidth = options?.minWidth ?? 60;
  const maxWidth = options?.maxWidth ?? 500;
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    baseColumns.forEach((c) => {
      if (c.width) w[c.key] = c.width;
    });
    return w;
  });
  const [searchKeywords, setSearchKeywords] = useState<Record<string, string>>({});

  const handleResizeStart = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = widths[key] || 100;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
        setWidths((prev) => ({ ...prev, [key]: newWidth }));
      };
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [widths, minWidth, maxWidth]
  );

  const enhancedColumns = useMemo(() => {
    return baseColumns.map((col) => {
      const enhanced: EnhancedColumn = { ...col };

      // 所有列都支持拖动调整宽度，仅操作列（key === 'action'）和右侧固定列除外
      if (col.key !== 'action' && col.fixed !== 'right') {
        const currentWidth = widths[col.key] || col.width;
        enhanced.width = currentWidth;
        enhanced.title = (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {col.title}
            </span>
            <div
              onMouseDown={handleResizeStart(col.key)}
              style={{
                position: 'absolute',
                right: -4,
                top: 0,
                bottom: 0,
                width: 8,
                cursor: 'col-resize',
                userSelect: 'none',
                zIndex: 10,
              }}
            />
          </div>
        );
      }

      if (col.sortable && col.dataIndex) {
        enhanced.sorter = (a: any, b: any) => {
          const av = a[col.dataIndex!];
          const bv = b[col.dataIndex!];
          if (av == null && bv == null) return 0;
          if (av == null) return -1;
          if (bv == null) return 1;
          if (typeof av === 'number' && typeof bv === 'number') return av - bv;
          return String(av).localeCompare(String(bv), 'zh-CN');
        };
      }

      if (col.searchable && col.dataIndex) {
        const keyword = searchKeywords[col.key] || '';
        enhanced.filterDropdown = ({ confirm, clearFilters }: any) => (
          <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
            <Input
              placeholder={`搜索 ${typeof col.title === 'string' ? col.title : ''}`}
              defaultValue={keyword}
              onChange={(e) => {
                setSearchKeywords((prev) => ({ ...prev, [col.key]: e.target.value }));
              }}
              onPressEnter={() => confirm()}
              style={{ width: 200, marginBottom: 8, display: 'block' }}
            />
            <Space>
              <Button type="primary" onClick={() => confirm()} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>
                搜索
              </Button>
              <Button
                onClick={() => {
                  setSearchKeywords((prev) => ({ ...prev, [col.key]: '' }));
                  clearFilters();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                重置
              </Button>
            </Space>
          </div>
        );
        enhanced.onFilter = (value: any, record: any) => {
          const val = String(record[col.dataIndex!] ?? '').toLowerCase();
          return val.includes(String(value).toLowerCase());
        };
        enhanced.filterIcon = (filtered: boolean) => (
          <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
        );
        if (keyword) {
          enhanced.filteredValue = [keyword];
        }
      }

      return enhanced;
    });
  }, [baseColumns, widths, searchKeywords, handleResizeStart]);

  const filteredData = useMemo(() => {
    return dataSource.filter((record) => {
      for (const [key, keyword] of Object.entries(searchKeywords)) {
        if (!keyword) continue;
        const col = baseColumns.find((c) => c.key === key);
        if (!col?.dataIndex) continue;
        const val = String((record as any)[col.dataIndex] ?? '').toLowerCase();
        if (!val.includes(keyword.toLowerCase())) return false;
      }
      return true;
    });
  }, [dataSource, searchKeywords, baseColumns]);

  const resetSearch = useCallback(() => setSearchKeywords({}), []);

  return {
    columns: enhancedColumns,
    filteredData,
    widths,
    searchKeywords,
    setWidths,
    resetSearch,
    setSearchKeywords,
  };
}