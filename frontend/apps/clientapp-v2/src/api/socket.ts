import {Socket} from 'phoenix';

import {getAccessToken} from '@/api/authStorage';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

if (window.location.hostname.startsWith('192.168.')) {
  baseURL = `http://${window.location.hostname}:4000`;
}

const wsURL = `${baseURL.replace(/^http/, 'ws')}/socket`;

let socket: Socket | null = null;

// Access tokens live 5 minutes; the params closure is re-evaluated on every
// (re)connect, so reconnects always carry the freshest token.
export function getSocket(): Socket {
  if (!socket) {
    socket = new Socket(wsURL, {params: () => ({token: getAccessToken() ?? ''})});
    socket.connect();
  }
  return socket;
}
