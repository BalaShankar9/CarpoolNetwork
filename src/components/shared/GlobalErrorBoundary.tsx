import { Component, ReactNode } from 'react';

/**
 * GlobalErrorBoundary - Top-level error boundary for catching boot-time errors
 * 
 * This component catches errors that occur during initial app startup,
 * including errors from environment variable validation and Supabase initialization.
 * 
 * It intentionally uses minimal dependencies (no external icons, no Supabase calls)
 * to ensure it can render even when core services fail.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console - don't use Sentry here as it might not be initialized
    console.error('[GlobalErrorBoundary] Fatal error during app initialization:', error);
    console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    // Clear any cached state and reload
    window.location.reload();
  };

  handleClearAndRetry = () => {
    // Clear all storage and caches, then reload
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(key => caches.delete(key));
        });
      }
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      const isMissingEnvVars = this.state.error?.message?.includes('environment variable');
      
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            maxWidth: '500px',
            width: '100%',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              padding: '24px',
              color: 'white',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}>
                {/* Warning Icon (inline SVG to avoid dependencies) */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  Unable to Start Application
                </h1>
              </div>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                We're having trouble starting up. Please try again or contact support.
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {/* Configuration Error Help */}
              {isMissingEnvVars && (
                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '14px', fontWeight: '600' }}>
                    Configuration Issue Detected
                  </h3>
                  <p style={{ margin: 0, color: '#78350f', fontSize: '13px', lineHeight: '1.5' }}>
                    This appears to be a server configuration issue. If you're the site administrator,
                    please verify that all required environment variables are set in your Netlify dashboard.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={this.handleRetry}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {/* Refresh Icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                  Retry
                </button>
                <button
                  onClick={this.handleClearAndRetry}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {/* Trash Icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                  Clear Cache & Retry
                </button>
              </div>

              {/* Technical Details (Development or expandable) */}
              {(isDev || this.state.error) && (
                <details style={{ marginTop: '20px' }}>
                  <summary style={{
                    cursor: 'pointer',
                    color: '#6b7280',
                    fontSize: '13px',
                    userSelect: 'none',
                  }}>
                    Technical details {isDev && '(Development mode)'}
                  </summary>
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: '200px',
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                    </div>
                    {this.state.error?.stack && (
                      <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#6b7280',
                      }}>
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Support Info */}
              <div style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center',
                fontSize: '13px',
                color: '#6b7280',
              }}>
                <p style={{ margin: 0 }}>
                  If this problem persists, please contact{' '}
                  <a href="mailto:support@carpoolnetwork.co.uk" style={{ color: '#2563eb' }}>
                    support@carpoolnetwork.co.uk
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
