import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

interface UseSocketOptions {
  /** Socket.IO namespace to connect to. Default: '' (root namespace) */
  namespace?: string;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { namespace = '' } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = namespace ? `${SOCKET_URL}${namespace}` : SOCKET_URL;

    const socketInstance = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        // Pass userId so the /citizens namespace can tag location updates
        userId: localStorage.getItem('userId') || undefined,
      },
    });

    socketInstance.on('connect', () => {
      console.log(`✅ Conectado a WebSockets [${namespace || '/'}]`, socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log(`❌ Desconectado de WebSockets [${namespace || '/'}]`);
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [namespace]);

  return { socket, connected };
}
