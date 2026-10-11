import type { AssignmentWithCourse } from '../types';

/**
 * "Needs attention" — an assignment that was graded below the student's
 * threshold and that they can still attempt again.
 *
 * Kept as pure functions so the rule can be reasoned about (and tested) without
 * mounting the Topbar, and so the feed and the notification bridge can share one
 * definition of what counts.
 */

export interface AttentionItem {
  assignment: AssignmentWithCourse;
  /** Grade that was awarded. */
  grade: number;
  /** Maximum grade for the assignment. */
  gradeMax: number;
  /** grade / gradeMax * 100. */
  percent: number;
  /** Epoch ms of the due date, when there is one. */
  dueDate?: number;
}

const DEFAULT_MAX_GRADE = 100;

/**
 * Grade as a 0–100 percentage, or null when there is no usable numeric grade.
 *
 * `gradefordisplay` is preferred for display elsewhere, but it cannot be trusted
 * for arithmetic: Moodle returns "Very good" for a letter scale, "65.00 %" for a
 * percentage scale, and null far more often than not. The numeric grade plus the
 * assignment's maximum is the only reliable pair, so it wins here.
 */
export function gradePercent(assignment: AssignmentWithCourse): number | null {
  if (typeof assignment.grade !== 'number' && typeof assignment.grade !== 'string') return null;

  const awarded = Number(assignment.grade);
  if (!Number.isFinite(awarded)) return null;

  const max = assignment.gradeMax;
  // A 0 maximum would make every grade infinite; treat a missing or invalid
  // maximum as the conventional 100 so the percentage stays meaningful.
  const denominator = typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX_GRADE;

  return (awarded / denominator) * 100;
}

/**
 * Whether the student can make another attempt.
 *
 * `cansubmit` is Moodle's own answer and is trusted first, but it is false more
 * often than it should be (it is false for every unstarted assignment on some
 * installs), so the attempt counters back it up rather than replacing it.
 */
export function canAttemptAgain(assignment: AssignmentWithCourse): boolean {
  const now = Date.now();

  // Past the hard cutoff Moodle rejects submissions regardless of the due date.
  if (assignment.cutoffdate && assignment.cutoffdate * 1000 <= now) return false;

  if (assignment.canSubmit === true) return true;

  const maxAttempts = assignment.maxattempts;
  if (typeof maxAttempts !== 'number' || !Number.isFinite(maxAttempts)) return false;

  // -1 means unlimited. Whether those attempts can actually be taken again is
  // decided by attemptreopenmethod: 'none' closes the assignment for good.
  if (maxAttempts === -1) return assignment.attemptReopenMethod !== 'none';
  if (maxAttempts <= 0) return false;

  // attemptnumber is 0-indexed, so one attempt has been used when it is 0.
  const usedAttempts = (assignment.attemptNumber ?? 0) + 1;
  return usedAttempts < maxAttempts;
}

/** The assignment, when it is graded below `thresholdPercent` and still retryable. */
export function needsAttention(assignment: AssignmentWithCourse, thresholdPercent: number): AttentionItem | null {
  if (!Number.isFinite(thresholdPercent)) return null;

  const percent = gradePercent(assignment);
  if (percent === null) return null;

  // A grade only exists once it has been released; without one there is nothing
  // to warn about, and `grade` alone cannot distinguish "not graded" from "0".
  if (assignment.graded !== true) return null;
  if (percent >= thresholdPercent) return null;
  if (!canAttemptAgain(assignment)) return null;

  const gradeMax = assignment.gradeMax && assignment.gradeMax > 0 ? assignment.gradeMax : DEFAULT_MAX_GRADE;

  return {
    assignment,
    grade: Number(assignment.grade),
    gradeMax,
    percent,
    dueDate: assignment.duedate ? assignment.duedate * 1000 : undefined,
  };
}

/** Worst first: lowest score, then the one due soonest. */
export function sortAttentionWorstFirst(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    if (a.percent !== b.percent) return a.percent - b.percent;
    return (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER);
  });
}

export function collectAttention(
  assignments: AssignmentWithCourse[] | undefined,
  thresholdPercent: number,
): AttentionItem[] {
  if (!assignments?.length) return [];
  return sortAttentionWorstFirst(
    assignments
      .map((assignment) => needsAttention(assignment, thresholdPercent))
      .filter((item): item is AttentionItem => item !== null),
  );
}
