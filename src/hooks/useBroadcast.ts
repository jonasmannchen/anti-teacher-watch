import { useState, useEffect, useRef, useCallback } from "react";

/**
 * BroadcastChannel-basierte Kommunikation zwischen Host und Zuschauer-Tabs.
 * 
 * Hinweis: BroadcastChannel funktioniert zwischen Tabs/Fenstern im selben Browser.
 * Für echte Cross-Device-Kommunikation wäre ein WebSocket-Server erforderlich.
 * In diesem Prototyp wird die Verbindung über BroadcastChannel simuliert.
 */

interface BroadcastMessage {
  type: "status" | "config" | "ping" | "pong";
  sessionId: string;
  active: boolean;
  timestamp: number;
}

const CHANNEL_NAME = "virtual-display-sync";

export function useBroadcast(sessionId: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const viewersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const msg = event.data;
      if (msg.sessionId !== sessionId) return;

      if (msg.type === "ping") {
        // Viewer fragt nach Status
        channel.postMessage({
          type: "status",
          sessionId,
          active: isActive,
          timestamp: Date.now(),
        } as BroadcastMessage);
      }
    };

    return () => {
      channel.close();
    };
  }, [sessionId, isActive]);

  const startBroadcast = useCallback(() => {
    setIsActive(true);
    setIsConnected(true);
  }, []);

  const stopBroadcast = useCallback(() => {
    setIsActive(false);
    setIsConnected(false);
    setViewerCount(0);
  }, []);

  return {
    isConnected,
    viewerCount,
    isActive,
    startBroadcast,
    stopBroadcast,
  };
}

export function useViewerBroadcast(sessionId: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    // Ping senden, um Status vom Host zu erhalten
    channel.postMessage({
      type: "ping",
      sessionId,
      active: false,
      timestamp: Date.now(),
    } as BroadcastMessage);

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const msg = event.data;
      if (msg.sessionId !== sessionId) return;

      if (msg.type === "status") {
        setIsActive(msg.active);
        setIsConnected(true);
      }
    };

    // Regelmäßig pingen
    const interval = setInterval(() => {
      channel.postMessage({
        type: "ping",
        sessionId,
        active: false,
        timestamp: Date.now(),
      } as BroadcastMessage);
    }, 3000);

    return () => {
      clearInterval(interval);
      channel.close();
    };
  }, [sessionId]);

  return { isConnected, isActive };
}
