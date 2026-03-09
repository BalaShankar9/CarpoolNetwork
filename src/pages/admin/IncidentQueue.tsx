import AdminLayout from '../../components/admin/AdminLayout';

export default function IncidentQueue() {
  return (
    <AdminLayout title="Incident Queue" subtitle="Auto-triaged errors and fix queue">
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
        <p className="text-slate-400">Incident queue — coming in Phase 2</p>
      </div>
    </AdminLayout>
  );
}
