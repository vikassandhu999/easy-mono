import {Socket} from 'phoenix';

import {getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

if (window.location.hostname.startsWith('192.168.')) {
  baseURL = `http://${window.location.hostname}:4000`;
}

const wsURL = `${baseURL.replace(/^http/, 'ws')}/socket`;

let socket: Socket | null = null;
let refreshing = false;

// Reconnects re-read storage for the token, but if the access token expired
// while the socket was idle nothing refreshes it — realtime stays dead until an
// unrelated HTTP call happens to refresh storage. On a socket error, proactively
// refresh a stale token so the next retry carries a live one.
async function refreshTokenIfStale() {
  const expiresAt = getTokenExpiresAt();
  const refreshToken = getRefreshToken();
  if (refreshing || !refreshToken || (expiresAt && expiresAt - Date.now() > 30_000)) {
    return;
  }
  refreshing = true;
  try {
    const res = await fetch(`${baseURL}/v1/auth/token`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({grant_type: 'refresh_token', refresh_token: refreshToken}),
    });
    if (res.ok) {
      setTokens(await res.json());
    }
  } finally {
    refreshing = false;
  }
}

// Access tokens live 5 minutes; the params closure is re-evaluated on every
// (re)connect, so reconnects always carry the freshest token.
export function getSocket(): Socket {
  if (!socket) {
    socket = new Socket(wsURL, {params: () => ({token: getAccessToken() ?? ''})});
    socket.onError(() => {
      refreshTokenIfStale();
    });
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
