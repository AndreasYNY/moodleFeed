import { useLocation, useParams } from 'react-router-dom';
import { DiscussionView } from '../components/DiscussionView';
import { Topbar } from '../components/Topbar';
import { useI18n } from '../lib/i18n';
import type { ForumThread } from '../types';

export function DiscussionPage() {
  const { t } = useI18n();
  const params = useParams();
  const discussionId = Number(params.discussionId);
  const thread = useLocation().state?.thread as ForumThread | undefined;

  return (
    <>
      <Topbar title={thread?.name ?? t('forums.title')} breadcrumb={`${t('forums.title')}${thread?.courseName ? ` -> ${thread.courseName}${thread.courseShortName ? ` · ${thread.courseShortName}` : ''}` : ''}`} />
      <DiscussionView discussionId={discussionId} />
    </>
  );
}
