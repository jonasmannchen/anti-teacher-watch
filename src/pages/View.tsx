import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CONFIG } from "../config";
import { useViewerBroadcast } from "../hooks/useBroadcast";

/**
 * Zuschaueransicht (View).
 * 
 * Zeigt AUSSCHLIESSLICH das konfigurierte Bild an.
 * Keine Bedienelemente, keine Navigation, keine Informationen über den Host.
 * Das Bild wird in voller Bildschirmgröße angezeigt und passt sich automatisch an.
 * 
 * WICHTIG: Diese Seite zeigt NIEMALS den tatsächlichen Bildschirm des Host-Geräts.
 * Es wird ausschließlich das in CONFIG.displayImage festgelegte Bild angezeigt.
 */
export default function View() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { isConnected, isActive } = useViewerBroadcast(sessionId || "default");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Canvas-Rendering für konsistente Darstellung
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      setImageLoaded(true);
      canvas.width = 1920;
      canvas.height = 1080;

      const render = () => {
        // Hintergrund füllen
        ctx.fillStyle = CONFIG.displayBackground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bild zentriert zeichnen
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

      // Video-Stream starten
      const stream = canvas.captureStream(30);
      video.srcObject = stream;
      video.play().catch(() => {});
    };

    img.onerror = () => {
      setImageError(true);
      // Auch bei Fehler den Hintergrund rendern
      canvas.width = 1920;
      canvas.height = 1080;
      ctx.fillStyle = CONFIG.displayBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    img.src = CONFIG.displayImage;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Vollbild-Ansicht bei Klick (für AirPlay auf TV)
  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    }
  };

  // AirPlay Picker
  const handleAirPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      (video as any).webkitShowPlaybackTargetPicker();
    } catch (e) {
      console.warn("AirPlay nicht verfügbar:", e);
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-none"
      style={{ backgroundColor: CONFIG.displayBackground }}
      onClick={handleFullscreen}
    >
      {/* Hauptbild als <img> - primäre Anzeige */}
      <img
        src={CONFIG.displayImage}
        alt=""
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          objectFit: CONFIG.fit,
          backgroundColor: CONFIG.displayBackground,
        }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Verstecktes Video-Element für AirPlay-Stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: CONFIG.fit,
          backgroundColor: CONFIG.displayBackground,
          opacity: 0,
          pointerEvents: "none",
        }}
        playsInline
        muted
        controls={false}
      />

      {/* Verstecktes Canvas für Video-Stream-Rendering */}
      <canvas
        ref={canvasRef}
        className="fixed w-0 h-0 opacity-0 pointer-events-none"
      />

      {/* Fehleranzeige */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: CONFIG.displayBackground }}>
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Bild nicht verfügbar</p>
          </div>
        </div>
      )}

      {/* Ladeanzeige */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: CONFIG.displayBackground }}>
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      {/* Optionale Steuerung (nur wenn in Config aktiviert) */}
      {CONFIG.showControls && (
        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); handleAirPlay(); }}
            className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white"
            title="AirPlay"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.5 18.5c-.3 0-.5.2-.5.5s.2.5.5.5h11c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-11zm14-4c0-.3-.2-.5-.5-.5h-2c-.3 0-.5.2-.5.5v2.5H6.5V8h7c.3 0 .5-.2.5-.5v-2c0-.3-.2-.5-.5-.5H5c-.6 0-1 .4-1 1v12c0 .6.4 1 1 1h14c.6 0 1-.4 1-1v-4.5zm-4-6c0-.3-.2-.5-.5-.5h-2c-.3 0-.5.2-.5.5v2.5h-2l3.5 4 3.5-4h-2v-2.5z"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
            className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white"
            title="Vollbild"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
