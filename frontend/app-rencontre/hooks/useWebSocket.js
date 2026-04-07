import { useEffect, useRef } from "react";

export default function useWebSocket(userId, onMessageReceived) {
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(`wss://application-de-rencontre-production.up.railway.app/ws/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => console.log("WS connecté !");
    ws.onmessage = (event) => onMessageReceived(JSON.parse(event.data));
    ws.onerror = (err) => console.log("WS ERREUR:", err.message);
    ws.onclose = () => console.log("WS fermé");

    return () => ws.close();
  }, [userId]);

  return wsRef;
}