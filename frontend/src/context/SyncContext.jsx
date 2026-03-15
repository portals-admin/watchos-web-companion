import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getTokens } from '../api/client';

const SyncContext = createContext(null);

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export function SyncProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [watchConnected, setWatchConnected] = useState(false);
  const [latestSummary, setLatestSummary] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    const tokens = getTokens();
    if (!tokens?.accessToken) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token: tokens.accessToken }));
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      switch (msg.type) {
        case 'auth_ok':
          setConnected(true);
          reconnectDelay.current = 1000;
          break;
        case 'auth_error':
          ws.close();
          break;
        case 'summary_update':
          setLatestSummary(msg.summary);
          break;
        case 'watch_connected':
          setWatchConnected(true);
          break;
        case 'watch_disconnected':
          setWatchConnected(false);
          break;
        default:
          break;
      }
    };

    ws.onerror = () => { /* handled by onclose */ };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Exponential backoff, cap at 30s
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  function sendHealthUpdate(sample) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'health_update', data: sample }));
    }
  }

  return (
    <SyncContext.Provider value={{ connected, watchConnected, latestSummary, setLatestSummary, sendHealthUpdate }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
