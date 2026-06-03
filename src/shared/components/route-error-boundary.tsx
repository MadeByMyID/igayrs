import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary designed for lazy-loaded route chunks.
 * Catches chunk loading failures and provides a retry mechanism
 * that re-attempts the dynamic import without a full page reload.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[RouteErrorBoundary] Chunk load failed:', error, errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return <ChunkErrorFallback error={error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function ChunkErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isChunkError = isChunkLoadError(error);

  return (
    <div className="route-error-fallback" role="alert">
      <div className="route-error-icon">
        <AlertTriangle className="route-error-svg" aria-hidden="true" />
      </div>
      <h2 className="route-error-title">Page could not be loaded</h2>
      <p className="route-error-desc">
        {isChunkError
          ? 'A network error occurred while loading this page. Please check your connection and try again.'
          : error.message}
      </p>
      <button type="button" className="route-error-retry" onClick={onRetry}>
        <RefreshCw className="route-error-retry-icon" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

/** Detects chunk/module loading errors from dynamic imports */
function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module') ||
    message.includes('failed to fetch')
  );
}
