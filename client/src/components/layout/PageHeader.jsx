import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared PageHeader component.
 *
 * Props:
 *   title: string (Page or entity title, required)
 *   count?: React.ReactNode (e.g. "12 records" or 12)
 *   badge?: React.ReactNode (e.g. StatusBadge or CustomerTypeBadge)
 *   actions?: React.ReactNode (Buttons or menus, right-aligned)
 *   description?: string | React.ReactNode (Subtitle; omitted if empty)
 *   backLink?: { label?: string, onClick?: () => void } | React.ReactNode
 *   hideTitleOnMobile?: boolean (When true, hides visible in-page title below md, kept in sr-only)
 *   srOnlyTitle?: boolean (When true, renders h1 with sr-only, no visible header title)
 *   children?: React.ReactNode (Additional elements placed under the title row, e.g. info subtitle)
 *   className?: string
 */
export function PageHeader({
  title,
  count,
  badge,
  actions,
  description,
  backLink,
  hideTitleOnMobile = false,
  srOnlyTitle = false,
  children,
  className = '',
}) {
  // Always update document.title
  useEffect(() => {
    if (title) {
      document.title = `${title} · BillGST`;
    }
  }, [title]);

  return (
    <header className={`py-4 space-y-2 ${className}`}>
      {/* Optional Back Link */}
      {backLink && (
        <div>
          {typeof backLink === 'object' && 'onClick' in backLink ? (
            <button
              type="button"
              onClick={backLink.onClick}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{backLink.label || 'Back'}</span>
            </button>
          ) : (
            backLink
          )}
        </div>
      )}

      {/* Main Row: Title (+ count, badge) on left, Actions on right */}
      {srOnlyTitle ? (
        <h1 className="sr-only">{title}</h1>
      ) : (
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {hideTitleOnMobile ? (
                <>
                  <h1 className="hidden md:inline text-[18px] font-semibold text-text tracking-tight leading-tight truncate">
                    {title}
                  </h1>
                  <h1 className="sr-only md:hidden">{title}</h1>
                </>
              ) : (
                <h1 className="text-[18px] font-semibold text-text tracking-tight leading-tight truncate">
                  {title}
                </h1>
              )}

              {badge && <div className="shrink-0">{badge}</div>}

              {count !== undefined && count !== null && (
                <span className="text-[13px] font-normal text-muted tabular-nums">
                  {typeof count === 'number'
                    ? `${count} ${count === 1 ? 'record' : 'records'}`
                    : count}
                </span>
              )}
            </div>

            {/* Optional Description / Subtitle */}
            {description && (
              <p className="text-[13px] text-muted mt-1 leading-relaxed">
                {description}
              </p>
            )}

            {/* Optional Extra Elements (e.g. details subtitle) */}
            {children}
          </div>

          {/* Right-aligned Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {actions}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
