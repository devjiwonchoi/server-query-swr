const SERVER_REFERENCE = Symbol.for('react.server.reference');

// This is only to derive a unique key from the source "query" for SWR cache key,
// so that we don't need separate function to generate a key.
export function getServerReferenceId(fn: unknown): string {
  if (typeof fn !== 'function') {
    throw new Error('[getServerReferenceId] argument is not a function.');
  }

  if ((fn as { $$typeof?: symbol }).$$typeof !== SERVER_REFERENCE) {
    throw new Error(
      "[getServerReferenceId] argument is not a server reference. Pass a function from a 'use server' or 'use cache' module, read on the server.",
    );
  }

  if (!('$$id' in fn)) {
    throw new Error('[getServerReferenceId] server reference has no `$$id`.');
  }

  return fn.$$id as string;
}
