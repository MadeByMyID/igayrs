import { AlertTriangle, LoaderCircle } from 'lucide-react';

interface LoadingStateProps {
  label: string;
}

interface ErrorStateProps {
  description: string;
  title: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <LoaderCircle className="ui-icon loading-spinner" aria-hidden="true" />
      <div>{label}</div>
    </div>
  );
}

export function ErrorState({ description, title }: ErrorStateProps) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-state-icon">
        <AlertTriangle className="empty-state-svg" aria-hidden="true" />
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
    </div>
  );
}
