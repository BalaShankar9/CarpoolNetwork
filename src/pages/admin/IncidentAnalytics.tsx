import AdminLayout from '../../components/admin/AdminLayout';

export default function IncidentAnalytics() {
  return (
    <AdminLayout title="Incident Analytics" subtitle="Resolution trends and MTTR breakdown">
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
        <p className="text-slate-400">Incident analytics — coming in Phase 3</p>
      </div>
    </AdminLayout>
  );
}
