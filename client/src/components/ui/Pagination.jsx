import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../invoice/InvoiceEditorUI';

/**
 * Shared, accessible pagination footer component.
 * Reusable for Customers, Invoices, and Products lists.
 *
 * Props:
 *   page: number (current page, starting at 1)
 *   totalPages: number (total number of pages)
 *   total: number (total record count across all pages)
 *   limit: number (items per page)
 *   onPageChange: (newPage: number) => void
 *   onLimitChange?: (newLimit: number) => void (optional rows-per-page selector)
 *   limitOptions?: number[] (default: [10, 25, 50])
 *   resourceName?: string (e.g. 'customers', 'invoices', 'products'; default 'customers')
 *   loading?: boolean (retains button layout and prevents jumping during fetching)
 *   className?: string
 */
export function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50],
  resourceName = 'customers',
  loading = false,
  className = '',
}) {
  // Render nothing when everything fits on one page or there are no results
  if (total <= limit) return null;

  const pages = Math.max(1, totalPages || Math.ceil(total / limit) || 1);
  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  const canGoPrevious = page > 1 && !loading;
  const canGoNext = page < pages && !loading;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange?.(page - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange?.(page + 1);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center justify-between border-t border-border py-3 px-4 gap-4 ${className}`}
    >
      {/* Left: Showing from to of total + Optional rows-per-page select (hidden below sm) */}
      <div className="hidden sm:flex items-center gap-3 text-[13px] text-muted">
        <div>
          Showing <span className="font-medium text-text tabular-nums">{from}</span> to{' '}
          <span className="font-medium text-text tabular-nums">{to}</span> of{' '}
          <span className="font-medium text-text tabular-nums">{total}</span> {resourceName}
        </div>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/80">
            <label htmlFor="pagination-rows-select" className="text-xs text-muted">
              Rows:
            </label>
            <select
              id="pagination-rows-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={loading}
              className="h-7 rounded-md border border-border bg-surface text-text text-xs px-2 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-surface text-text">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Previous, Page X of Y, Next */}
      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          aria-label="Previous page"
          aria-disabled={!canGoPrevious}
          className="h-9 px-3 rounded-lg text-xs font-medium gap-1 min-w-[84px] justify-center"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span>Previous</span>
        </Button>

        <span className="text-[13px] font-medium text-muted tabular-nums px-2 select-none whitespace-nowrap min-w-[70px] text-center">
          Page <span className="text-text font-semibold">{page}</span> of{' '}
          <span className="text-text font-semibold">{pages}</span>
        </span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Next page"
          aria-disabled={!canGoNext}
          className="h-9 px-3 rounded-lg text-xs font-medium gap-1 min-w-[84px] justify-center"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
