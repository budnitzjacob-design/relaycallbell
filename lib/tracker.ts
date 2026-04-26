'use client';

const SESSION_KEY = 'relay_sid';

function getSessionId(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp(`${SESSION_KEY}=([^;]+)`));
  if (m) return m[1];
  const sid = crypto.randomUUID();
  const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${SESSION_KEY}=${sid}; path=/; expires=${exp}; SameSite=Lax`;
  return sid;
}

export function track(event_type: string, payload?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    event_type,
    path: window.location.pathname,
    payload,
    session_id: getSessionId(),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
    }
  } catch {}
}

export function initTracker() {
  if (typeof window === 'undefined') return;
  getSessionId();
  track('page_view');
}
