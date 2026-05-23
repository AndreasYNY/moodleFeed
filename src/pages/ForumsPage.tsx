import { ForumFeed } from '../components/ForumFeed';
import { Topbar } from '../components/Topbar';
import { useI18n } from '../lib/i18n';

export function ForumsPage() {
  const { t } = useI18n();
  return (
    <>
      <Topbar title={t('forums.title')} breadcrumb={t('forums.breadcrumb')} />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <ForumFeed />
      </main>
    </>
  );
}
