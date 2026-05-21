import { AssignmentFeed } from '../components/AssignmentFeed';
import { Topbar } from '../components/Topbar';

export function AssignmentsPage() {
  return (
    <>
      <Topbar title="Assignments" breadcrumb="All courses" />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <AssignmentFeed />
      </main>
    </>
  );
}
