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
