import { ForumFeed } from '../components/ForumFeed';
import { Topbar } from '../components/Topbar';

export function ForumsPage() {
  return (
    <>
      <Topbar title="Forums" breadcrumb="Recent discussions" />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <ForumFeed />
      </main>
    </>
  );
}
