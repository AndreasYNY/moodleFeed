import { LessonFeed } from '../components/LessonFeed';
import { Topbar } from '../components/Topbar';
import { useI18n } from '../lib/i18n';

export function LessonsPage() {
  const { t } = useI18n();
  return (
    <>
      <Topbar title={t('lessons.title')} breadcrumb={t('lessons.breadcrumb')} />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <LessonFeed />
      </main>
    </>
  );
}
