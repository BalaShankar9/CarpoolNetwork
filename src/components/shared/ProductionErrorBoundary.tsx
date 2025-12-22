import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { errorTracker } from '../../services/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any | null;
  errorCount: number;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    errorTracker.captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorCount: this.state.errorCount + 1,
    });

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
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const error = this.state.error;
    const errorInfo = this.state.errorInfo;

    const bugReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    console.log('Bug report:', bugReport);

    alert('Error details have been logged. Our team will investigate this issue.');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
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
              {isDevelopment && error && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Error Details (Development Only)</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Message:</p>
                      <p className="text-sm text-gray-600 font-mono bg-white p-2 rounded border border-gray-200">
                        {error.message}
                      </p>
                    </div>
                    {error.stack && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Stack Trace:</p>
                        <pre className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-40">
                          {error.stack}
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
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Try refreshing the page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Go back to the home page and try again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
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

                <button
                  onClick={this.handleReportBug}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  <Bug className="w-4 h-4" />
                  Report Bug
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
                Error ID: {Date.now().toString(36)}
                {isDevelopment && ' • Development Mode'}
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
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ProductionErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ProductionErrorBoundary>
    );
  };
}
