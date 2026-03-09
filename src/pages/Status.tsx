export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Carpool Network</h1>
            <p className="text-sm text-slate-500">System Status</p>
          </div>
        </div>

        <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium text-green-800">All Systems Operational</span>
          </div>
        </div>

        <p className="text-slate-400 text-center py-12">Full status page — coming in Phase 4</p>

        <div className="text-center text-sm text-slate-400 mt-12 pt-6 border-t border-slate-200">
          Powered by CarpoolNetwork
        </div>
      </div>
    </div>
  );
}
