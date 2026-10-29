export interface Route {
  path: string[];
  query: URLSearchParams;
}

export function currentRoute(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export function href(path: string, params?: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') q.set(k, String(v));
  const qs = q.toString();
  return `#/${path}${qs ? '?' + qs : ''}`;
}

export function navigate(path: string, params?: Record<string, string | number | undefined>, replace = false): void {
  const url = href(path, params);
  if (replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = url;
}

/** Aggiorna i parametri senza ricaricare la vista. */
export function replaceQuery(params: Record<string, string | number | undefined>): void {
  const r = currentRoute();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') r.query.delete(k);
    else r.query.set(k, String(v));
  }
  const qs = r.query.toString();
  history.replaceState(null, '', `#/${r.path.join('/')}${qs ? '?' + qs : ''}`);
}
