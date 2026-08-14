import {Socket} from 'phoenix';

import {getAccessToken} from '@/api/authStorage';
import {refreshTokenIfNeeded} from '@/api/token-refresh';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

if (window.location.hostname.startsWith('192.168.')) {
  baseURL = `http://${window.location.hostname}:4000`;
}

const wsURL = `${baseURL.replace(/^http/, 'ws')}/socket`;

let socket: Socket | null = null;
const SOCKET_REFRESH_THRESHOLD_MS = 30_000;

// Reconnects re-read storage for the token, but if the access token expired
// while the socket was idle nothing refreshes it — realtime stays dead until an
// unrelated HTTP call happens to refresh storage. On a socket error, proactively
// refresh a stale token so the next retry carries a live one.
async function refreshTokenIfStale() {
  await refreshTokenIfNeeded(baseURL, SOCKET_REFRESH_THRESHOLD_MS);
}

// Access tokens live 5 minutes; the params closure is re-evaluated on every
// (re)connect, so reconnects always carry the freshest token.
export function getSocket(): Socket {
  if (!socket) {
    const nextSocket = new Socket(wsURL, {params: () => ({token: getAccessToken() ?? ''})});
    socket = nextSocket;
    nextSocket.onError(() => {
      refreshTokenIfStale();
    });
    // Refresh before the first handshake. HTTP requests do the same in their
    // middleware, but they race a synchronous socket connect after a reload.
    refreshTokenIfStale().finally(() => {
      if (socket === nextSocket) {
        nextSocket.connect();
      }
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
