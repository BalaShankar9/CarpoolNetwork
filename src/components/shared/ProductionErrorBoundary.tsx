import { Component, ReactNode, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorContext, logClientError, reportUserBug } from '../../services/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: ErrorContext;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any | null;
  errorCount: number;
  errorId?: string;
  hasReported?: boolean;
  reporting?: boolean;
  reportSuccess?: boolean;
  userComment?: string;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      errorId: undefined,
      hasReported: false,
      reporting: false,
      reportSuccess: false,
      userComment: '',
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errorId = `err-${Date.now().toString(36)}`;
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      errorId,
    }));

    if (!this.state.hasReported) {
      this.setState({ hasReported: true });
      logClientError(
        error,
        { componentStack: errorInfo?.componentStack },
        {
          ...(this.props.context || {}),
          errorId,
        }
      );
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      errorId: undefined,
      hasReported: false,
      reporting: false,
      reportSuccess: false,
      userComment: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = async () => {
    this.setState({ reporting: true, reportSuccess: false });
    const result = await reportUserBug({
      errorId: this.state.errorId,
      route: this.props.context?.route,
      userId: this.props.context?.userId,
      role: this.props.context?.role,
      userComment: this.state.userComment || undefined,
      extra: {
        componentStack: this.state.errorInfo?.componentStack,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    });
    this.setState({ reporting: false, reportSuccess: result.success });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-8 h-8" />
                <h1 className="text-2xl font-bold">Something Went Wrong</h1>
              </div>
              <p className="text-red-100">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {isDevelopment && this.state.error && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Error Details (Development Only)</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Message:</p>
                      <p className="text-sm text-gray-600 font-mono bg-white p-2 rounded border border-gray-200">
                        {this.state.error.message}
                      </p>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Stack Trace:</p>
                        <pre className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">What you can do:</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 inline-block flex-shrink-0" aria-hidden />
                    <span>Try refreshing the page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 inline-block flex-shrink-0" aria-hidden />
                    <span>Go back to the home page and try again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 inline-block flex-shrink-0" aria-hidden />
                    <span>If the problem persists, please report this bug</span>
                  </li>
                </ul>
              </div>

              {this.state.errorCount > 3 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-1">Multiple Errors Detected</h3>
                      <p className="text-sm text-yellow-800">
                        This error has occurred {this.state.errorCount} times. You may want to refresh the page or clear your browser cache.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-600">Add a note (optional)</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                    rows={2}
                    value={this.state.userComment}
                    onChange={(e) => this.setState({ userComment: e.target.value })}
                    placeholder="What were you doing when this happened?"
                  />
                  <button
                    onClick={this.handleReportBug}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-60"
                    disabled={this.state.reporting}
                  >
                    <Bug className="w-4 h-4" />
                    {this.state.reporting ? 'Sending...' : this.state.reportSuccess ? 'Bug Logged' : 'Report Bug'}
                  </button>
                  {this.state.reportSuccess && (
                    <p className="text-xs text-green-600">Thanks! Your report was submitted.</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
                Error ID: {this.state.errorId || 'n/a'}
                {isDevelopment && ' (Development mode)'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  ComponentToWrap: React.ComponentType<P>,
  fallback?: ReactNode,
  context?: ErrorContext
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ProductionErrorBoundary fallback={fallback} context={context}>
        <ComponentToWrap {...props} />
      </ProductionErrorBoundary>
    );
  };
}

// Hook-based wrapper to provide route/user context to the boundary
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const context = useMemo<ErrorContext>(
    () => ({
      route: location.pathname,
      userId: user?.id ?? null,
      role: isAdmin ? 'admin' : user ? 'user' : 'guest',
    }),
    [location.pathname, user?.id, isAdmin]
  );

  return <ProductionErrorBoundary context={context}>{children}</ProductionErrorBoundary>;
}

