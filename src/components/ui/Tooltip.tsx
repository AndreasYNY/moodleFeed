import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/**
 * Hover/focus hint for triggers that perform an action.
 *
 * Radix Tooltip deliberately ignores touch — there is no hover, so a tap would
 * collide with the trigger's own action. That is the correct trade for a button,
 * so use this for buttons and `HintPopover` for non-interactive labels that need
 * a tap.
 *
 * Requires `TooltipPrimitive.Provider` above it — added once in main.tsx.
 */
export function Tooltip({
  label,
  children,
  side = 'top',
  align = 'center',
}: {
  label: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className="z-50 max-w-[min(280px,calc(100vw-2rem))] rounded-lg border border-slate-200 dark:border-slate-600/80 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-soft dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-white dark:fill-gray-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
