import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useCallback, useRef, useState, type ReactNode } from 'react';

/**
 * A hint that opens on hover *and* tap.
 *
 * Radix Popover is click/tap only, which leaves desktop hover uncovered. This
 * drives the open state itself: pointer-enter and focus open it, pointer-leave
 * and blur close it, and a tap toggles. Touch devices get no hover, so the tap
 * path is what serves them.
 *
 * Use for information about content (like a deadline). Use `Tooltip` when the
 * trigger performs an action, where hover/focus is the correct affordance.
 */
export function HintPopover({
  label,
  children,
  side = 'bottom',
  align = 'center',
}: {
  /** The hint text. */
  label: ReactNode;
  /** The trigger. Rendered as a button so it is focusable and tappable. */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef(0);

  const close = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = 0;
    setOpen(false);
  }, []);

  const openDelayed = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    // A short delay stops sweeping the pointer across a row of chips from
    // flashing every hint open in turn.
    hoverTimer.current = window.setTimeout(() => setOpen(true), 120);
  }, []);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          // aria-expanded on a label-only trigger reads as a toggle, which this
          // is not; Radix already wires aria-describedby for the hint.
          onClick={() => (open ? close() : setOpen(true))}
          onPointerEnter={openDelayed}
          onPointerLeave={close}
          onFocus={() => setOpen(true)}
          onBlur={close}
        >
          {children}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          // Tapping the trigger must not yank focus to the hint on mobile.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={close}
          onPointerDownOutside={close}
          onInteractOutside={close}
          className="z-50 max-w-[min(320px,calc(100vw-2rem))] rounded-lg border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          {label}
          <PopoverPrimitive.Arrow className="fill-white dark:fill-gray-900" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
