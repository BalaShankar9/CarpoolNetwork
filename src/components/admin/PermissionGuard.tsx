import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Permission, AdminRole } from '../../types/admin';
import { Shield, Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission;
  minRole?: AdminRole;
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * Permission Guard Component
 *
 * Protects routes and content based on admin permissions or roles.
 *
 * Usage:
 * - `permission`: Check if user has a specific permission
 * - `minRole`: Check if user has at least this role level
 * - `fallback`: Content to show when access is denied
 * - `redirectTo`: Path to redirect to when access is denied
 * - `showAccessDenied`: Show a styled access denied message
 */
export default function PermissionGuard({
  children,
  permission,
  minRole,
  fallback = null,
  redirectTo,
  showAccessDenied = false,
}: PermissionGuardProps) {
  const { hasPermission, hasRole, loading, adminRole } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check if user has required permission or role
  const hasAccess =
    (permission && hasPermission(permission)) ||
    (minRole && hasRole(minRole)) ||
    (!permission && !minRole && adminRole !== null);

  if (!hasAccess) {
    // Redirect if specified
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Show access denied message
    if (showAccessDenied) {
      return <AccessDeniedMessage permission={permission} minRole={minRole} />;
    }

    // Show fallback content
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AccessDeniedMessageProps {
  permission?: Permission;
  minRole?: AdminRole;
}

function AccessDeniedMessage({ permission, minRole }: AccessDeniedMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 text-center max-w-md mb-4">
        You don't have permission to access this content.
        {permission && (
          <span className="block mt-2 text-sm text-gray-500">
            Required permission: <code className="bg-gray-100 px-2 py-1 rounded">{permission}</code>
          </span>
        )}
        {minRole && (
          <span className="block mt-2 text-sm text-gray-500">
            Required role: <code className="bg-gray-100 px-2 py-1 rounded">{minRole}</code> or higher
          </span>
        )}
      </p>
      <a
        href="/admin"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Return to Dashboard
      </a>
    </div>
  );
}

/**
 * Higher-order component version of PermissionGuard
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    permission?: Permission;
    minRole?: AdminRole;
    redirectTo?: string;
  }
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGuard {...options} showAccessDenied>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Hook to check permissions programmatically
 */
export function usePermissionCheck() {
  const { hasPermission, hasRole, adminRole, loading } = useAuth();

  return {
    loading,
    isAdmin: adminRole !== null,
    adminRole,
    hasPermission,
    hasRole,
    can: (permission: Permission) => hasPermission(permission),
    canAny: (permissions: Permission[]) => permissions.some(p => hasPermission(p)),
    canAll: (permissions: Permission[]) => permissions.every(p => hasPermission(p)),
  };
}

/**
 * Component that only renders children if user has permission
 * Useful for conditionally showing UI elements like buttons
 */
export function Can({
  permission,
  minRole,
  children,
  fallback = null,
}: {
  permission?: Permission;
  minRole?: AdminRole;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, hasRole } = useAuth();

  const hasAccess =
    (permission && hasPermission(permission)) ||
    (minRole && hasRole(minRole));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component that shows a tooltip explaining why something is disabled
 */
export function PermissionTooltip({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      <div className="opacity-50 cursor-not-allowed">{children}</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        <Shield className="w-3 h-3 inline mr-1" />
        Requires: {permission}
      </div>
    </div>
  );
}
