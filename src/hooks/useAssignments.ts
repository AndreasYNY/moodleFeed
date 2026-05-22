import { useQuery } from '@tanstack/react-query';
import { Moodle } from '../lib/moodle';
import { courseColor } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import type { AssignmentSubmissionFile, AssignmentSubmissionStatus, AssignmentWithCourse, Course } from '../types';
import { useCourses } from './useCourses';

export function useAssignments() {
  const { baseUrl, token, userId } = useAuthStore();
  const hiddenCourseIds = useSettingsStore((state) => state.hiddenCourseIds);
  const coursesQuery = useCourses();
  const hiddenCourseIdSet = new Set(hiddenCourseIds);
  const courses = coursesQuery.data ?? [];
  const courseIds = courses.map((course) => course.id);

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', courseIds],
    queryFn: () => Moodle.assignments(baseUrl!, token!, courseIds),
    enabled: Boolean(baseUrl && token && courseIds.length),
  });

  const completionsQuery = useQuery({
    queryKey: ['completion', courseIds, userId],
    queryFn: () => Moodle.completions(baseUrl!, token!, courseIds, userId!),
    enabled: Boolean(baseUrl && token && userId && courseIds.length),
  });

  const completionByCourse = new Map<number, Map<number, number>>();
  completionsQuery.data?.forEach(({ courseId, data }) => {
    completionByCourse.set(
      courseId,
      new Map(data.statuses.map((status) => [status.cmid, status.state])),
    );
  });

  const courseById = new Map<number, Course>(courses.map((course) => [course.id, course]));
  const baseAssignments: AssignmentWithCourse[] =
    assignmentsQuery.data?.courses.flatMap((courseGroup) =>
      courseGroup.assignments.map((assignment) => {
        const course = courseById.get(assignment.course) ?? courseGroup;
        const completionState = completionByCourse.get(assignment.course)?.get(assignment.cmid);
        return {
          ...assignment,
          courseName: course.fullname,
          courseShortName: 'shortname' in course ? course.shortname : undefined,
          courseColor: courseColor(assignment.course),
          completionState,
          submitted: completionState === 1 || completionState === 2,
        };
      }),
    ) ?? [];

  const assignmentIds = baseAssignments.map((assignment) => assignment.id);
  const submissionStatusesQuery = useQuery({
    queryKey: ['assignment-submission-statuses', assignmentIds],
    queryFn: () => Moodle.assignmentSubmissionStatuses(baseUrl!, token!, assignmentIds),
    enabled: Boolean(baseUrl && token && assignmentIds.length),
    staleTime: 5 * 60 * 1000,
  });
  const submissionStatusByAssignment = new Map(
    submissionStatusesQuery.data?.map(({ assignmentId, data }) => [assignmentId, data]) ?? [],
  );

  const assignments = baseAssignments.map((assignment) => {
    const submissionData = submissionStatusByAssignment.get(assignment.id);
    const lastAttempt = submissionData?.lastattempt;
    const submissionStatus = lastAttempt?.submission?.status;
    const submittedFiles = extractSubmissionFiles(submissionData);
    const submittedText = extractSubmissionText(submissionData);
    const feedbackText = extractFeedbackText(submissionData);

    return {
      ...assignment,
      submitted: assignment.submitted || submissionStatus === 'submitted',
      submissionStatus,
      gradingStatus: lastAttempt?.gradingstatus,
      graded: lastAttempt?.graded,
      grade: submissionData?.feedback?.grade?.grade,
      gradeDisplay: submissionData?.feedback?.grade?.gradefordisplay,
      feedbackText,
      submittedFiles,
      submittedText,
    };
  });

  const sortedAssignments = assignments.sort((a, b) => (a.duedate || Number.MAX_SAFE_INTEGER) - (b.duedate || Number.MAX_SAFE_INTEGER));

  return {
    ...assignmentsQuery,
    data: sortedAssignments.filter((assignment) => !hiddenCourseIdSet.has(assignment.course)),
    allData: sortedAssignments,
    isLoading: coursesQuery.isLoading || assignmentsQuery.isLoading || completionsQuery.isLoading || submissionStatusesQuery.isLoading,
    error:
      coursesQuery.error ||
      assignmentsQuery.error ||
      completionsQuery.error ||
      submissionStatusesQuery.error,
  };
}

function extractSubmissionFiles(status?: AssignmentSubmissionStatus): AssignmentSubmissionFile[] {
  return (
    status?.lastattempt?.submission?.plugins
      ?.flatMap((plugin) => plugin.fileareas?.flatMap((area) => area.files ?? []) ?? [])
      .filter(Boolean) ?? []
  );
}

function extractSubmissionText(status?: AssignmentSubmissionStatus): string | undefined {
  return status?.lastattempt?.submission?.plugins
    ?.flatMap((plugin) => plugin.editorfields ?? [])
    .map((field) => field.text ?? field.description ?? '')
    .find((text) => text.trim().length > 0);
}

function extractFeedbackText(status?: AssignmentSubmissionStatus): string | undefined {
  return status?.feedback?.plugins
    ?.flatMap((plugin) => plugin.editorfields ?? [])
    .map((field) => field.text ?? field.description ?? '')
    .find((text) => text.trim().length > 0);
}
