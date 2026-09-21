import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo } from 'react';
import { useAssignments } from '../hooks/useAssignments';
import { useForums } from '../hooks/useForums';
import { useI18n } from '../lib/i18n';
import { useNotificationsStore } from '../store/notifications';
import { useSettingsStore } from '../store/settings';

interface NotificationSnapshot {
  assignmentIds: number[];
  forumReplies: Record<number, number>;
  alertedKeys: string[];
}

const storageKey = 'moodlefeed-notification-snapshot';

function readSnapshot(): NotificationSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as NotificationSnapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: NotificationSnapshot) {
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function notifyBrowser(title: string, body: string, enabled: boolean) {
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body });
}

export function NotificationsBridge() {
  const { t, dateLocale } = useI18n();
  const settings = useSettingsStore();
  const assignmentsQuery = useAssignments({ includeSubmissionStatuses: false });
  const forumsQuery = useForums({ checkReplies: false, discussionsPerForum: 10 });
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const pushToastStore = useNotificationsStore((state) => state.pushToast);

  const assignments = useMemo(() => assignmentsQuery.allData ?? assignmentsQuery.data ?? [], [assignmentsQuery.allData, assignmentsQuery.data]);
  const threads = useMemo(() => forumsQuery.data ?? [], [forumsQuery.data]);

  const currentAssignmentIds = useMemo(() => assignments.map((assignment) => assignment.id), [assignments]);
  const currentForumReplies = useMemo(
    () =>
      Object.fromEntries(
        threads.map((thread) => [thread.discussion ?? thread.id, thread.numreplies ?? 0]),
      ) as Record<number, number>,
    [threads],
  );

  const pushToast = useCallback((title: string, body: string, id?: string, href?: string) => {
    const notificationId = id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addNotification({ id: notificationId, title, body, href });
    pushToastStore({ id: notificationId, title, body, href });
    notifyBrowser(title, body, settings.notifyBrowser);
  }, [addNotification, pushToastStore, settings.notifyBrowser]);

  useEffect(() => {
    if (assignmentsQuery.isLoading || forumsQuery.isLoading) return;
    if (!assignments.length && !threads.length) return;

    const snapshot = readSnapshot();
    const nextSnapshot: NotificationSnapshot = snapshot ?? {
      assignmentIds: currentAssignmentIds,
      forumReplies: currentForumReplies,
      alertedKeys: [],
    };
    const alertedKeys = new Set(nextSnapshot.alertedKeys);

    if (!snapshot) {
      writeSnapshot(nextSnapshot);
      return;
    }

    if (settings.notifyNewAssignments) {
      assignments
        .filter((assignment) => !snapshot.assignmentIds.includes(assignment.id))
        .forEach((assignment) => {
          pushToast(t('notifications.newAssignment'), t('notifications.courseItem', { course: assignment.courseName, name: assignment.name }), `assignment-new-${assignment.id}`, '/assignments');
        });
    }

    assignments.forEach((assignment) => {
      if (assignment.submitted || !assignment.duedate) return;

      const dueMs = assignment.duedate * 1000;
      const minutesUntilDue = (dueMs - Date.now()) / 60000;
      const overdue = minutesUntilDue < 0;
      const dueSoon = minutesUntilDue >= 0 && minutesUntilDue <= settings.notifyBeforeMinutes;

      if (settings.notifyOverdue && overdue) {
        const key = `assignment-overdue-${assignment.id}`;
        if (!alertedKeys.has(key)) {
          alertedKeys.add(key);
          pushToast(t('notifications.assignmentOverdue'), t('notifications.courseItem', { course: assignment.courseName, name: assignment.name }), key, '/assignments');
        }
      }

      if (settings.notifyBeforeMinutes > 0 && dueSoon) {
        const key = `assignment-due-${assignment.id}`;
        if (!alertedKeys.has(key)) {
          alertedKeys.add(key);
          pushToast(
            t('notifications.assignmentDueSoon'),
            t('notifications.assignmentDueBody', { course: assignment.courseName, name: assignment.name, time: formatDistanceToNow(dueMs, { addSuffix: true, locale: dateLocale }) }),
            key,
            '/assignments',
          );
        }
      }
    });

    if (settings.notifyForumReplies) {
      threads.forEach((thread) => {
        const discussionId = thread.discussion ?? thread.id;
        const previousReplies = snapshot.forumReplies[discussionId] ?? thread.numreplies ?? 0;
        const currentReplies = thread.numreplies ?? 0;
        if (currentReplies > previousReplies) {
          pushToast(
            t('notifications.newForumReplies'),
            t('notifications.courseItem', { course: thread.courseName, name: thread.name || thread.subject }),
            `forum-replies-${discussionId}-${currentReplies}`,
            `/forums/${discussionId}`,
          );
        }
      });
    }

    writeSnapshot({
      assignmentIds: currentAssignmentIds,
      forumReplies: currentForumReplies,
      alertedKeys: [...alertedKeys].slice(-500),
    });
  }, [
    assignments,
    assignmentsQuery.isLoading,
    currentAssignmentIds,
    currentForumReplies,
    forumsQuery.isLoading,
    settings.notifyBeforeMinutes,
    settings.notifyBrowser,
    settings.notifyForumReplies,
    settings.notifyNewAssignments,
    settings.notifyOverdue,
    threads,
    pushToast,
    t,
    dateLocale,
  ]);

  return null;
}
