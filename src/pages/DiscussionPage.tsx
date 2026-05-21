import { useLocation, useParams } from 'react-router-dom';
import { DiscussionView } from '../components/DiscussionView';
import { Topbar } from '../components/Topbar';
import type { ForumThread } from '../types';

export function DiscussionPage() {
  const params = useParams();
  const discussionId = Number(params.discussionId);
  const thread = useLocation().state?.thread as ForumThread | undefined;

  return (
    <>
      <Topbar title={thread?.name ?? 'Discussion'} breadcrumb={`Forums${thread?.courseName ? ` -> ${thread.courseName}${thread.courseShortName ? ` · ${thread.courseShortName}` : ''}` : ''}`} />
      <DiscussionView discussionId={discussionId} />
    </>
  );
}
