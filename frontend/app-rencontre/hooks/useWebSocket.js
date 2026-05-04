import { useEffect, useRef } from "react";

export default function useWebSocket(userId, onMessageReceived) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!userId) return;

    isMounted.current = true;

    const connect = () => {
      if (!isMounted.current) return;

      console.log("🔌 Connexion WS...");

      const ws = new WebSocket(
        `wss://application-de-rencontre-production.up.railway.app/ws/${userId}`
      );

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WS connecté");

        // 🔥 PING toutes les 30s (évite coupure serveur)
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 🔥 ignore messages inconnus
          if (!data?.type) return;

          onMessageReceived(data);

        } catch (err) {
          console.log("❌ Erreur parsing WS:", err);
        }
      };

      ws.onerror = (err) => {
        console.log("⚠️ WS ERROR:", err.message);
      };

      ws.onclose = () => {
        console.log("❌ WS fermé");

        // 🔥 cleanup ping
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }

        // 🔥 reconnect seulement si composant actif
        if (isMounted.current) {
          console.log("🔁 Reconnexion dans 2s...");
          reconnectTimeout.current = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      console.log("🧹 Cleanup WS");

      isMounted.current = false;

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId]);

  return wsRef;
}