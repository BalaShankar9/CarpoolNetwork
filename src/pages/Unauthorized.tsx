import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
        <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Go home
          </Link>
          <Link
            to="/help"
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Help center
          </Link>
        </div>
      </div>
    </div>
  );
}
