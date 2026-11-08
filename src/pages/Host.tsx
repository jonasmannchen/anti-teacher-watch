import { useState, useEffect, useRef, useCallback } from "react";
import { CONFIG } from "../config";
import { useBroadcast } from "../hooks/useBroadcast";

/**
 * Steuerungsseite (Host).
 * 
 * Hier kann der Benutzer die Übertragung starten und beenden.
 * Die AirPlay-Ausgabe wird über ein Video-Element mit Canvas-Stream realisiert,
 * das ausschließlich das konfigurierte Bild enthält.
 */
export default function Host() {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  const { isConnected, isActive, startBroadcast, stopBroadcast } = useBroadcast(sessionId);
  const [airplaySupported, setAirplaySupported] = useState(false);
  const [airplayActive, setAirplayActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const viewUrl = `${window.location.origin}${window.location.pathname}#/view/${sessionId}`;

  // AirPlay-Unterstützung prüfen
  useEffect(() => {
    const video = document.createElement("video");
    const supports = typeof (video as any).webkitShowPlaybackTargetPicker === "function";
    setAirplaySupported(supports);
  }, []);

  // Bild laden
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = CONFIG.displayImage;
  }, []);

  // Canvas-Rendering für AirPlay-Video-Stream
  const startCanvasRender = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const render = () => {
      if (!imageRef.current) return;

      // Hintergrund füllen
      ctx.fillStyle = CONFIG.displayBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bild zentriert zeichnen mit korrektem Seitenverhältnis
      const img = imageRef.current;
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;

      let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

      if (CONFIG.fit === "contain") {
        if (imgRatio > canvasRatio) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgRatio;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        }
      } else {
        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgRatio;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    // Canvas als Video-Stream setzen
    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    video.play().catch(() => {});
  }, []);

  const stopCanvasRender = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  // Übertragung starten
  const handleStart = () => {
    startBroadcast();
    setTimeout(() => {
      startCanvasRender();
    }, 100);
  };

  // Übertragung beenden
  const handleStop = () => {
    stopBroadcast();
    stopCanvasRender();
    setAirplayActive(false);
  };

  // AirPlay Picker öffnen
  const handleAirPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      (video as any).webkitShowPlaybackTargetPicker();
    } catch (e) {
      console.warn("AirPlay nicht verfügbar:", e);
    }
  };

  // AirPlay-Events überwachen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleAirPlayConnect = () => {
      setAirplayActive(true);
    };

    const handleAirPlayDisconnect = () => {
      setAirplayActive(false);
    };

    video.addEventListener("webkitcurrentplaybacktargetiswirelesschanged" as any, () => {
      const isWireless = (video as any).webkitCurrentPlaybackTargetIsWireless;
      setAirplayActive(isWireless);
    });

    video.addEventListener("webkitplaybacktargetavailabilitychanged" as any, (e: any) => {
      if (e.availability === "available") {
        setAirplaySupported(true);
      }
    });

    return () => {
      video.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged" as any, handleAirPlayConnect);
      video.removeEventListener("webkitplaybacktargetavailabilitychanged" as any, handleAirPlayDisconnect);
    };
  }, [isActive]);

  // Link kopieren
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback für ältere Browser
      const textArea = document.createElement("textarea");
      textArea.value = viewUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm">
              📺
            </div>
            <span className="text-lg font-medium">Virtual Display</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
            <span className="text-sm text-gray-400">
              {isActive ? "Live" : "Bereit"}
            </span>
          </div>
        </div>
      </header>

      {/* Hauptbereich */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Vorschau */}
          <section>
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-gray-800 shadow-2xl">
              <img
                src={CONFIG.displayImage}
                alt="Vorschau"
                className="w-full h-full object-contain"
                style={{ backgroundColor: CONFIG.displayBackground }}
              />
              {isActive && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-medium">LIVE</span>
                </div>
              )}
            </div>
          </section>

          {/* Steuerung */}
          <section className="space-y-4">
            {!isActive ? (
              <button
                onClick={handleStart}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium text-lg transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              >
                Übertragung starten
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium text-lg transition-all active:scale-[0.98] shadow-lg shadow-red-600/20"
              >
                Übertragung beenden
              </button>
            )}
          </section>

          {/* Zuschauer-Link */}
          {isActive && (
            <section className="space-y-3 animate-in fade-in duration-300">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Zuschauer-Link
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 font-mono truncate">
                  {viewUrl}
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  {copied ? "✓ Kopiert" : "Kopieren"}
                </button>
              </div>
            </section>
          )}

          {/* AirPlay */}
          {isActive && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                AirPlay
              </h2>
              {airplaySupported ? (
                <div className="space-y-3">
                  <button
                    onClick={handleAirPlay}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      airplayActive
                        ? "bg-blue-600/20 border border-blue-500/50 text-blue-400"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.5 18.5c-.3 0-.5.2-.5.5s.2.5.5.5h11c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-11zm14-4c0-.3-.2-.5-.5-.5h-2c-.3 0-.5.2-.5.5v2.5H6.5V8h7c.3 0 .5-.2.5-.5v-2c0-.3-.2-.5-.5-.5H5c-.6 0-1 .4-1 1v12c0 .6.4 1 1 1h14c.6 0 1-.4 1-1v-4.5zm-4-6c0-.3-.2-.5-.5-.5h-2c-.3 0-.5.2-.5.5v2.5h-2l3.5 4 3.5-4h-2v-2.5z"/>
                    </svg>
                    {airplayActive ? "AirPlay verbunden" : "AirPlay auswählen"}
                  </button>
                  {airplayActive && (
                    <p className="text-xs text-green-400 text-center">
                      Das Bild wird an ein AirPlay-Gerät gesendet.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400">
                    AirPlay ist auf diesem Gerät/Browser nicht verfügbar. 
                    Öffnen Sie die Zuschaueransicht auf einem Apple TV oder einem anderen AirPlay-kompatiblen Gerät.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Tipp: Öffnen Sie den Zuschauer-Link auf einem zweiten Gerät und nutzen Sie dort die Bildschirmübertragung.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Verbindungsstatus */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Status
            </h2>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Sitzung</span>
                <span className="font-mono text-gray-300">{sessionId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Übertragung</span>
                <span className={isActive ? "text-green-400" : "text-gray-500"}>
                  {isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Verbindung</span>
                <span className={isConnected ? "text-green-400" : "text-yellow-400"}>
                  {isConnected ? "Verbunden" : "Wartet"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Verstecktes Video-Element für AirPlay */}
      <video
        ref={videoRef}
        className="fixed bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none"
        playsInline
        muted
        controls={false}
      />
      
      {/* Verstecktes Canvas für Rendering */}
      <canvas
        ref={canvasRef}
        className="fixed bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none"
      />
    </div>
  );
}
