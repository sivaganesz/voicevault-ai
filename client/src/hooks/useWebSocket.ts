import { useState, useRef, useCallback, useEffect } from 'react';

type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WSMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler<T = any> = (data: T) => void;

export interface WebSocketHooks {
  status: WSStatus;
  lastMessage: WSMessage | null;
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => void;
  onMessage: <T = any>(type: string, handler: MessageHandler<T>) => void;
}

export function useWebSocket(url: string): WebSocketHooks {
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Record<string, MessageHandler>>({});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return;

    clearReconnectTimeout();
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        setLastMessage(data);

        if (data.type === 'status') setStatus(data.status);

        if (handlersRef.current[data.type]) {
          handlersRef.current[data.type](data);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setStatus('disconnected');

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current++;
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };
  }, [url]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    reconnectAttemptsRef.current = maxReconnectAttempts;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const onMessage = useCallback(<T = any>(type: string, handler: MessageHandler<T>) => {
    handlersRef.current[type] = handler;
  }, []);

  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { status, lastMessage, connect, disconnect, send, onMessage };
}