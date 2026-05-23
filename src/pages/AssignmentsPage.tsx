import { AssignmentFeed } from '../components/AssignmentFeed';
import { Topbar } from '../components/Topbar';
import { useI18n } from '../lib/i18n';

export function AssignmentsPage() {
  const { t } = useI18n();
  return (
    <>
      <Topbar title={t('assignments.title')} breadcrumb={t('assignments.breadcrumb')} />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <AssignmentFeed />
      </main>
    </>
  );
}
