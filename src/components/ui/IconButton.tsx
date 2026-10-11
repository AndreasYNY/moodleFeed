import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

/**
 * The three icon-button recipes that were copy-pasted around the app, as one
 * component. Swapping the visual variants keeps the existing look while giving
 * every icon button the same focus ring, hover and disabled treatment.
 */
const VARIANTS = {
  /** Bordered, for header actions next to text-bearing buttons. */
  default:
    'rounded-lg border border-slate-200 dark:border-slate-600/80 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800',
  /** Borderless and quiet, for actions inside a card or row. */
  muted:
    'rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800',
  /** Hover lifts to the surface colour, used on tinted backgrounds. */
  quiet:
    'rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-gray-800',
} as const;

export type IconButtonVariant = keyof typeof VARIANTS;

export function IconButton({
  label,
  hint,
  variant = 'default',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible name, and the tooltip text when `hint` is not given. */
  label: string;
  /** Tooltip text, when it should differ from the accessible name. */
  hint?: string;
  variant?: IconButtonVariant;
  children: ReactNode;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={cn(VARIANTS[variant], 'disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    >
      {children}
    </button>
  );

  // No tooltip without a provider above, so only wrap when there is text to show.
  if (!hint && !label) return button;

  return (
    <Tooltip label={hint ?? label}>
      {button}
    </Tooltip>
  );
}
