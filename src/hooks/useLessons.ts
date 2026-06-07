import { useQuery } from '@tanstack/react-query';
import { Moodle, MoodleApiError } from '../lib/moodle';
import { courseColor } from '../lib/utils';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';
import type { Course, LessonWithCourse } from '../types';
import { useCourses } from './useCourses';

export function useLessons({
  includeCompletions = true,
  includeAccessInfo = true,
}: { includeCompletions?: boolean; includeAccessInfo?: boolean } = {}) {
  const { baseUrl, token, userId } = useAuthStore();
  const hiddenCourseIds = useSettingsStore((state) => state.hiddenCourseIds);
  const coursesQuery = useCourses();
  const hiddenCourseIdSet = new Set(hiddenCourseIds);
  const courses = coursesQuery.data ?? [];
  const courseIds = courses.map((course) => course.id);

  const lessonsQuery = useQuery({
    queryKey: ['lessons', courseIds],
    queryFn: () => Moodle.lessons(baseUrl!, token!, courseIds),
    enabled: Boolean(baseUrl && token && courseIds.length),
  });

  const completionsQuery = useQuery({
    queryKey: ['lesson-completion', courseIds, userId],
    queryFn: () => Moodle.completions(baseUrl!, token!, courseIds, userId!),
    enabled: Boolean(includeCompletions && baseUrl && token && userId && courseIds.length),
  });

  const lessonIds = lessonsQuery.data?.lessons.map((lesson) => lesson.id) ?? [];
  const accessInfoQuery = useQuery({
    queryKey: ['lesson-access-info', lessonIds],
    queryFn: () =>
      Promise.all(lessonIds.map((lessonId) =>
        Moodle.lessonAccessInfo(baseUrl!, token!, lessonId)
          .then((data) => ({ lessonId, data }))
          .catch((error) => {
            if (error instanceof MoodleApiError && error.errorcode === 'invalidtoken') throw error;
            return { lessonId, data: undefined };
          }),
      )),
    enabled: Boolean(includeAccessInfo && baseUrl && token && lessonIds.length),
    staleTime: 5 * 60 * 1000,
  });

  const completionByCourse = new Map<number, Map<number, number>>();
  completionsQuery.data?.forEach(({ courseId, data }) => {
    completionByCourse.set(
      courseId,
      new Map(data.statuses.map((status) => [status.cmid, status.state])),
    );
  });
  const accessInfoByLesson = new Map(
    accessInfoQuery.data?.map(({ lessonId, data }) => [lessonId, data]) ?? [],
  );

  const courseById = new Map<number, Course>(courses.map((course) => [course.id, course]));
  const lessons: LessonWithCourse[] = (lessonsQuery.data?.lessons ?? []).map((lesson) => {
    const course = courseById.get(lesson.course);
    const completionState = completionByCourse.get(lesson.course)?.get(lesson.coursemodule);
    return {
      ...lesson,
      courseName: course?.fullname ?? 'Course',
      courseShortName: course?.shortname,
      courseColor: courseColor(lesson.course),
      completionState,
      completed: completionState === 1 || completionState === 2,
      accessInfo: accessInfoByLesson.get(lesson.id),
    };
  });

  const sortedLessons = lessons.sort((a, b) => {
    const aTime = a.deadline || a.available || Number.MAX_SAFE_INTEGER;
    const bTime = b.deadline || b.available || Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  return {
    ...lessonsQuery,
    data: sortedLessons.filter((lesson) => !hiddenCourseIdSet.has(lesson.course)),
    allData: sortedLessons,
    isLoading:
      coursesQuery.isLoading ||
      lessonsQuery.isLoading ||
      (includeCompletions && completionsQuery.isLoading) ||
      (includeAccessInfo && accessInfoQuery.isLoading),
    error:
      coursesQuery.error ||
      lessonsQuery.error ||
      (includeCompletions ? completionsQuery.error : null) ||
      (includeAccessInfo ? accessInfoQuery.error : null),
  };
}
