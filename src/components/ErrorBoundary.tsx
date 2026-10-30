import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onLogout?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, copied: false });
    window.location.href = '/';
  };

  private handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }
    if (this.props.onLogout) {
      this.props.onLogout();
    }
    window.location.href = '/login';
  };

  private handleCopyError = () => {
    const errorText = `${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}\n\nStack:\n${this.state.error?.stack || 'No stack trace available'}`;
    navigator.clipboard?.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {
      // fallback
    });
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || (this.state.error ? String(this.state.error) : 'An unexpected rendering error occurred.');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          padding: '24px',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '28px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '22px', color: '#1e293b', marginBottom: '8px', fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
              The application encountered an unexpected issue while rendering this view. Your session and data are secure.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '12px',
              color: '#334155',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '20px',
              fontFamily: 'Consolas, Monaco, monospace',
              position: 'relative'
            }}>
              <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
                Error Details:
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {errorMessage}
              </div>
              {this.state.error?.stack && (
                <details style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                  <summary style={{ fontWeight: 600, color: '#475569' }}>View call stack</summary>
                  <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
              <button
                onClick={this.handleCopyError}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {this.state.copied ? '✓ Copied!' : 'Copy Error Details'}
              </button>
              <button
                onClick={this.handleLogout}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Sign Out / Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
