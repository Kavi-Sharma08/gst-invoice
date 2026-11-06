import React, { useState, useEffect } from 'react';
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, X } from 'lucide-react';

/**
 * Accessible DropdownMenu component powered by Radix UI.
 *
 * - Renders content inside a portal directly on document.body to prevent clipping
 * - Placement bottom-end, 4px offset, auto-flips near viewport boundary
 * - Renders bottom sheet below md screen size
 * - Prevents event bubbling to avoid triggering parent row clicks
 * - Accessible keyboard navigation & focus return
 *
 * Props:
 *   items: Array<{
 *     label: string,
 *     icon?: React.ComponentType<{ className?: string }>,
 *     onSelect: () => void,
 *     danger?: boolean,
 *     dividerBefore?: boolean,
 *     disabled?: boolean
 *   }>
 *   trigger?: React.ReactNode
 *   ariaLabel?: string
 *   align?: 'start' | 'center' | 'end' (default: 'end')
 *   className?: string
 */
export function DropdownMenu({
  items = [],
  trigger,
  ariaLabel = 'Actions',
  align = 'end',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Filter out any falsy/undefined items
  const validItems = items.filter(Boolean);

  // Track viewport width (< 768px = mobile bottom sheet)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleItemSelect = (e, item) => {
    e.stopPropagation();
    if (item.disabled) return;
    setOpen(false);
    item.onSelect?.();
  };

  return (
    <RadixDropdownMenu.Root open={open} onOpenChange={setOpen}>
      <RadixDropdownMenu.Trigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {trigger ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            className={`inline-block ${className}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            {trigger}
          </span>
        ) : (
          <button
            type="button"
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        {isMobile ? (
          /* Mobile Bottom Sheet (Viewport < md) */
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />

            {/* Bottom Sheet Drawer */}
            <div
              role="menu"
              aria-label={ariaLabel}
              className="relative z-10 w-full rounded-t-2xl border-t border-border bg-surface p-4 shadow-2xl space-y-1 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  {ariaLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-border cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {validItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.label || idx}>
                    {item.dividerBefore && (
                      <div className="my-1.5 border-t border-border" role="separator" />
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={(e) => handleItemSelect(e, item)}
                      className={[
                        'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer focus:outline-none focus:bg-border',
                        item.danger
                          ? 'text-danger hover:bg-danger/10 focus:bg-danger/10'
                          : 'text-text hover:bg-border',
                        item.disabled ? 'opacity-40 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {Icon && <Icon className={`w-4 h-4 shrink-0 ${item.danger ? 'text-danger' : 'text-muted'}`} />}
                      <span className="truncate">{item.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          /* Desktop Radix Floating Content (Viewport ≥ md) */
          <RadixDropdownMenu.Content
            side="bottom"
            align={align}
            sideOffset={4}
            collisionPadding={8}
            className="z-50 min-w-48 rounded-lg border border-border bg-surface py-1 shadow-2xl focus:outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            onClick={(e) => e.stopPropagation()}
          >
            {validItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.label || idx}>
                  {item.dividerBefore && (
                    <RadixDropdownMenu.Separator className="my-1 border-t border-border" />
                  )}
                  <RadixDropdownMenu.Item
                    disabled={item.disabled}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleItemSelect(e, item);
                    }}
                    className={[
                      'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer outline-none select-none',
                      item.danger
                        ? 'text-danger hover:bg-danger/10 focus:bg-danger/10'
                        : 'text-text hover:bg-border focus:bg-border',
                      item.disabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${item.danger ? 'text-danger' : 'text-muted'}`} />}
                    <span className="truncate">{item.label}</span>
                  </RadixDropdownMenu.Item>
                </React.Fragment>
              );
            })}
          </RadixDropdownMenu.Content>
        )}
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}

export default DropdownMenu;
