import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL, { autoConnect: false, auth: { token: undefined } });

socket.on('connect_error', (error) => {
  const message = error.message.toLowerCase();
  if (message.includes('jwt') || message.includes('unauthorized')) {
    void import('./auth').then(({ useAuthStore }) => useAuthStore.getState().logout());
    window.location.assign('/login');
  }
});

export function connectSocket(token: string) {
  socket.auth = { token };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
