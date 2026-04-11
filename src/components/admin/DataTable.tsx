import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  className = '',
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    column: number;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (columnIndex: number) => {
    setSortConfig((prev) => {
      if (prev?.column === columnIndex) {
        return {
          column: columnIndex,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { column: columnIndex, direction: 'asc' };
    });
  };

  const getCellContent = (item: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return String(item[column.accessor] ?? '');
  };

  return (
    <div className={`bg-card rounded-2xl border border-border/70 overflow-hidden shadow-[0_18px_45px_-30px_rgba(30,41,59,0.45)] ${className}`}>
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {data.map((item, rowIndex) => (
              <div key={rowIndex} className="space-y-3 p-4">
                {columns.map((column, colIndex) => (
                  <div key={colIndex} className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {column.header}
                    </p>
                    <div className="text-sm text-foreground break-words">
                      {getCellContent(item, column)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((column, index) => (
                <th
                  key={index}
                  onClick={() => column.sortable && handleSort(index)}
                  className={`px-4 py-3.5 text-left text-[13px] font-semibold text-secondary lg:px-6 ${
                    column.className || ''
                  } ${column.sortable ? 'cursor-pointer hover:bg-muted/70' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortConfig?.column === index && (
                      <span className="text-muted-foreground">
                        {sortConfig.direction === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
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
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground lg:px-6"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/70 hover:bg-muted/40 transition-colors"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-4 text-sm text-foreground lg:px-6 ${
                        column.className || ''
                      }`}
                    >
                      {getCellContent(item, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
