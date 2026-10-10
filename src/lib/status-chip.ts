/**
 * Status surfaces shared by assignments, lessons and calendar events.
 *
 * These used to live as three copies of hardcoded hex in AssignmentCard,
 * LessonFeed and CalendarPage, handed to inline `style={{}}`. Inline styles
 * cannot see the `dark` class on <html>, so every chip and calendar event kept
 * its light pastel background on a dark card — which is what made dark mode
 * look broken.
 *
 * Two shapes on purpose, both describing the same tones — keep them in sync:
 *   - `chipTone`  Tailwind classes, for React chips. `dark:` does the switching.
 *   - `eventTone` raw values, for FullCalendar, which paints via inline
 *     `backgroundColor` / `textColor` props and cannot use classes.
 */

export type StatusTone =
  | 'completed'
  | 'answered'
  | 'graded'
  | 'overdue'
  | 'dueSoon'
  | 'closed'
  | 'neutral';

/** Border-bg-text classes. Pair with a `border` utility where a border is wanted. */
export const chipTone: Record<StatusTone, string> = {
  // Light values are the app's original pastels, kept verbatim as arbitrary
  // values so the light theme does not shift.
  completed:
    'border-[#97C459] bg-[#EAF3DE] text-[#3B6D11] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  answered:
    'border-[#6BA4D8] bg-[#E6F1FB] text-[#185FA5] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  graded:
    'border-[#6BA4D8] bg-[#E6F1FB] text-[#185FA5] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  overdue:
    'border-[#F09595] bg-[#FCEBEB] text-[#A32D2D] dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  dueSoon:
    'border-[#E0A93B] bg-[#FAEEDA] text-[#854F0B] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  closed:
    'border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300',
  neutral:
    'border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300',
};

export type StatusColors = { bg: string; text: string; border: string };

const lightTone: Record<StatusTone, StatusColors> = {
  completed: { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
  answered: { bg: '#E6F1FB', text: '#185FA5', border: '#6BA4D8' },
  graded: { bg: '#E6F1FB', text: '#185FA5', border: '#6BA4D8' },
  overdue: { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  dueSoon: { bg: '#FAEEDA', text: '#854F0B', border: '#E0A93B' },
  closed: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  neutral: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
};

// Matches the dark: half of chipTone (Tailwind -950/-300/-800) so chips and
// calendar events read as one system.
const darkTone: Record<StatusTone, StatusColors> = {
  completed: { bg: '#022c22', text: '#6ee7b7', border: '#065f46' },
  answered: { bg: '#172554', text: '#93c5fd', border: '#1e40af' },
  graded: { bg: '#172554', text: '#93c5fd', border: '#1e40af' },
  overdue: { bg: '#450a0a', text: '#fca5a5', border: '#991b1b' },
  dueSoon: { bg: '#451a03', text: '#fcd34d', border: '#92400e' },
  closed: { bg: '#1f2937', text: '#cbd5e1', border: '#374151' },
  neutral: { bg: '#1f2937', text: '#cbd5e1', border: '#374151' },
};

export function eventTone(tone: StatusTone, isDark: boolean): StatusColors {
  return isDark ? darkTone[tone] : lightTone[tone];
}

/**
 * Course-tinted calendar events. FullCalendar styles these through inline
 * `backgroundColor` / `textColor`, which cannot see `dark:` — so the dark side
 * is mixed from the course colour at runtime. Mixing keeps each course's hue
 * identity instead of flattening every event to one grey.
 */
export function courseEventTone(
  course: { dot: string; light: string; text: string },
  isDark: boolean,
): StatusColors {
  if (!isDark) return { bg: course.light, text: course.text, border: course.dot };
  return {
    bg: `color-mix(in srgb, ${course.dot} 20%, #111827)`,
    text: `color-mix(in srgb, ${course.dot} 45%, white)`,
    border: course.dot,
  };
}
