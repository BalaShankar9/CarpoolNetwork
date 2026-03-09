import AdminLayout from '../../components/admin/AdminLayout';

export default function PlatformHealthScore() {
  return (
    <AdminLayout title="Platform Health" subtitle="Composite health score with drill-downs">
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center">
        <p className="text-slate-400">Health score dashboard — coming in Phase 3</p>
      </div>
    </AdminLayout>
  );
}
