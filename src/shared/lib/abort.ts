export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}
