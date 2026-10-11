export interface SiteInfo {
  userid: number;
  fullname: string;
  username?: string;
  useremail?: string;
  siteurl?: string;
}

export interface Course {
  id: number;
  fullname: string;
  shortname?: string;
}

export interface Assignment {
  id: number;
  cmid: number;
  course: number;
  name: string;
  intro?: string;
  introformat?: number;
  introfiles?: AssignmentSubmissionFile[];
  introattachments?: AssignmentSubmissionFile[];
  duedate?: number;
  /** Hard deadline after which Moodle rejects submissions regardless of duedate. */
  cutoffdate?: number;
  /** When the assignment opens for submissions. */
  allowsubmissionsfromdate?: number;
  submissiondrafts?: number;
  /** How many attempts are allowed. -1 means unlimited. */
  maxattempts?: number;
  /**
   * Whether an attempt may be reopened after it is closed: 'none' (never),
   * 'manual' (a teacher reopens it) or 'automatic' (until the student passes).
   */
  attemptreopenmethod?: string;
  configs?: Array<{ plugin: string; subtype: string; name: string; value: string }>;
}

export interface AssignmentWithCourse extends Assignment {
  courseName: string;
  courseShortName?: string;
  courseColor: string;
  completionState?: number;
  submitted?: boolean;
  canEditSubmission?: boolean;
  canSubmit?: boolean;
  submissionStatus?: string;
  gradingStatus?: string;
  graded?: boolean;
  gradeDisplay?: string;
  /**
   * The grade that was awarded. Moodle returns this as a numeric string
   * ("97.00000") in practice, so it is read through Number() rather than
   * assumed to be a number.
   */
  grade?: number | string;
  /**
   * The assignment's maximum grade, from `mod_assign_get_assignments`. Not the
   * same as `grade`, which holds the grade that was awarded.
   */
  gradeMax?: number;
  /** Attempts allowed (-1 = unlimited), mirrored from the raw assignment. */
  maxattempts?: number;
  /** Which attempt the student is on, 0-indexed. */
  attemptNumber?: number;
  attemptReopenMethod?: string;
}

export interface Lesson {
  id: number;
  course: number;
  coursemodule: number;
  name: string;
  intro?: string;
  introformat?: number;
  introfiles?: AssignmentSubmissionFile[];
  available?: number;
  deadline?: number;
  timemodified?: number;
  grade?: number;
}

export interface LessonAccessInfo {
  canmanage?: boolean;
  cangrade?: boolean;
  canviewreports?: boolean;
  reviewmode?: boolean;
  attemptscount?: number;
  lastpageseen?: number;
  leftduringtimedsession?: boolean;
  firstpageid?: number;
  preventaccessreasons?: Array<{
    reason: string;
    data?: string | number | null;
    message?: string;
  }>;
  warnings?: unknown[];
}

export interface LessonWithCourse extends Lesson {
  courseName: string;
  courseShortName?: string;
  courseColor: string;
  completionState?: number;
  completed?: boolean;
  accessInfo?: LessonAccessInfo;
}

export interface AssignmentSubmissionFile {
  filename: string;
  fileurl: string;
  filesize?: number;
  mimetype?: string;
}

export interface AssignmentSubmissionStatus {
  lastattempt?: {
    gradingstatus?: string;
    graded?: boolean;
    canedit?: boolean;
    cansubmit?: boolean;
    submission?: {
      id?: number;
      status?: string;
      /** 0-indexed attempt number. */
      attemptnumber?: number;
      timemodified?: number;
      plugins?: Array<{
        type: string;
        name?: string;
        fileareas?: Array<{
          area: string;
          files?: AssignmentSubmissionFile[];
        }>;
        editorfields?: Array<{
          name: string;
          description?: string;
          text?: string;
          format?: number;
        }>;
      }>;
    };
  };
  feedback?: {
    grade?: {
      /** Moodle returns this as a numeric string, e.g. "97.00000". */
      grade?: number | string;
      gradefordisplay?: string;
      gradeddate?: number;
      grader?: {
        id?: number;
        fullname?: string;
      };
    };
    plugins?: Array<{
      type: string;
      name?: string;
      editorfields?: Array<{
        name: string;
        description?: string;
        text?: string;
        format?: number;
      }>;
      fileareas?: Array<{
        area: string;
        files?: AssignmentSubmissionFile[];
      }>;
    }>;
  };
  warnings?: unknown[];
}

export interface Forum {
  id: number;
  course: number;
  name: string;
  intro?: string;
  duedate?: number;
  cutoffdate?: number;
}

export interface Discussion {
  id: number;
  discussion?: number;
  forum: number;
  name: string;
  subject?: string;
  message?: string;
  userid?: number;
  usermodified?: number;
  userfullname?: string;
  timemodified?: number;
  timecreated?: number;
  created?: number;
  numreplies?: number;
  canreply?: boolean;
  duedate?: number;
  cutoffdate?: number;
}

export interface ForumThread extends Discussion {
  forumName: string;
  courseId: number;
  courseName: string;
  courseShortName?: string;
  courseColor: string;
  replied?: boolean;
  replyStatusLoading?: boolean;
  acceptsReplies?: boolean;
  dueDate?: number;
  cutoffDate?: number;
}

export interface ForumPostAttachment {
  filename: string;
  url: string;
  filesize?: number;
  mimetype?: string;
  icon?: string;
}

export interface ForumPost {
  id: number;
  discussionid?: number;
  parentid?: number;
  subject?: string;
  message?: string;
  messageformat?: number;
  author?: {
    id: number;
    fullname: string;
    groups?: Array<{ name: string }>;
  };
  userfullname?: string;
  userid?: number;
  created?: number;
  modified?: number;
  timecreated?: number;
  timemodified?: number;
  isprivatereply?: boolean;
  capabilities?: Record<string, boolean>;
  tags?: Array<{ rawname: string }>;
  rating?: number;
  attachments?: ForumPostAttachment[];
}

export type SyncInterval = 15 | 30 | 60 | 'manual';
