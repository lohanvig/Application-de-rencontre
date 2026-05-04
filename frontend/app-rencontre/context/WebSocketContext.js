import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";

const WebSocketContext = createContext(null);

const WS_URL = "wss://application-de-rencontre-production.up.railway.app/ws";

export function WebSocketProvider({ userId, children }) {
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const pingInterval = useRef(null);
  const reconnectTimeout = useRef(null);
  const isMounted = useRef(true);
  const activeMatchRef = useRef(null);

  const [unread, setUnread] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!userId) return;
    isMounted.current = true;

    const connect = () => {
      if (!isMounted.current) return;

      const ws = new WebSocket(`${WS_URL}/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WS connecté");
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data?.type) return;

          if (
            data.type === "new_message" &&
            data.sender_id !== userId &&
            activeMatchRef.current !== data.match_id
          ) {
            setUnread((prev) => ({
              ...prev,
              [data.match_id]: (prev[data.match_id] || 0) + 1,
            }));
          }

          if (data.type === "user_online") {
            setOnlineUsers((prev) => new Set([...prev, data.user_id]));
          }
          if (data.type === "user_offline") {
            setOnlineUsers((prev) => {
              const next = new Set(prev);
              next.delete(data.user_id);
              return next;
            });
          }

          listenersRef.current.forEach((cb) => cb(data));
        } catch {}
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        console.log("❌ WS fermé");
        if (pingInterval.current) clearInterval(pingInterval.current);
        if (isMounted.current) {
          console.log("🔁 Reconnexion dans 2s...");
          reconnectTimeout.current = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [userId]);

  const subscribe = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => listenersRef.current.delete(callback);
  }, []);

  const markAsRead = useCallback((matchId) => {
    activeMatchRef.current = matchId;
    setUnread((prev) => ({ ...prev, [matchId]: 0 }));
  }, []);

  const clearActiveMatch = useCallback(() => {
    activeMatchRef.current = null;
  }, []);

  const sendWS = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ subscribe, sendWS, unread, markAsRead, clearActiveMatch, onlineUsers }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWS() {
  return useContext(WebSocketContext);
}
