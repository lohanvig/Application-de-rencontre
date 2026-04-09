import { useEffect, useRef } from "react";

export default function useWebSocket(userId, onMessageReceived) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const ws = new WebSocket(`wss://application-de-rencontre-production.up.railway.app/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => console.log("WS connecté !");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageReceived(data);
        } catch (err) {
          console.log("Erreur parsing WS message:", err);
        }
      };
      ws.onerror = (err) => console.log("WS ERREUR:", err.message);
      ws.onclose = () => {
        console.log("WS fermé, tentative de reconnexion dans 2s...");
        reconnectTimeout.current = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [userId]);

  return wsRef;
}