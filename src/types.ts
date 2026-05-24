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
  allowsubmissionsfromdate?: number;
  submissiondrafts?: number;
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
      grade?: number;
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
}

export type SyncInterval = 15 | 30 | 60 | 'manual';
