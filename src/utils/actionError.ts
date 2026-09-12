export function reportActionError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Action impossible. Réessayez.';
  window.dispatchEvent(new CustomEvent('civic-action-error', { detail: message }));
}
