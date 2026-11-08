import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Host-Seite: Zeigt einen vollständig BLAUEN Bildschirm auf dem iPad.
 * 
 * Die separate AirPlay-Ausgabe erfolgt über ein eigenständiges Videoelement,
 * das einen Canvas-Stream mit SCHWARZEM Inhalt abspielt.
 * 
 * WICHTIG: Diese Implementierung nutzt die WebKit AirPlay API, um ein
 * spezifisches Videoelement an einen AirPlay-Empfänger zu senden.
 * Ob iPadOS Safari dies tatsächlich als separate Ausgabe (ohne Screen Mirroring)
 * behandelt, muss auf dem Gerät getestet werden.
 */
export default function Host() {
  const [airplayState, setAirplayState] = useState<"idle" | "connecting" | "active" | "unsupported" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Canvas mit schwarzem Inhalt rendern
  const startBlackCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const render = () => {
      // Vollständig schwarzer Hintergrund
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Optional: Kleiner Text zur Bestätigung
      ctx.fillStyle = "#333333";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AirPlay Output Active", canvas.width / 2, canvas.height / 2);

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return canvas;
  }, []);

  // Video-Stream aus Canvas erstellen
  const createVideoStream = useCallback(() => {
    const canvas = startBlackCanvas();
    if (!canvas) return null;

    try {
      const stream = canvas.captureStream(30);
      streamRef.current = stream;
      return stream;
    } catch (e) {
      console.error("Canvas captureStream fehlgeschlagen:", e);
      setErrorMessage("Canvas-Stream konnte nicht erstellt werden.");
      return null;
    }
  }, [startBlackCanvas]);

  // AirPlay-Unterstützung prüfen
  useEffect(() => {
    const video = document.createElement("video");
    const hasPicker = typeof (video as any).webkitShowPlaybackTargetPicker === "function";
    
    if (!hasPicker) {
      setAirplayState("unsupported");
    }
  }, []);

  // AirPlay-Events am Videoelement überwachen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTargetChange = () => {
      const isWireless = (video as any).webkitCurrentPlaybackTargetIsWireless;
      if (isWireless) {
        setAirplayState("active");
      } else {
        setAirplayState("idle");
      }
    };

    const handleAvailability = (e: any) => {
      if (e.availability === "available") {
        // AirPlay-Gerät verfügbar
      }
    };

    video.addEventListener("webkitcurrentplaybacktargetiswirelesschanged" as any, handleTargetChange);
    video.addEventListener("webkitplaybacktargetavailabilitychanged" as any, handleAvailability);

    return () => {
      video.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged" as any, handleTargetChange);
      video.removeEventListener("webkitplaybacktargetavailabilitychanged" as any, handleAvailability);
    };
  }, []);

  // AirPlay starten
  const handleStartAirPlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setAirplayState("connecting");

      // Stream erstellen und zuweisen
      const stream = createVideoStream();
      if (!stream) {
        setAirplayState("error");
        return;
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("x-webkit-airplay", "allow");
      
      // Video abspielen
      await video.play();

      // AirPlay Picker öffnen
      if (typeof (video as any).webkitShowPlaybackTargetPicker === "function") {
        (video as any).webkitShowPlaybackTargetPicker();
      } else {
        setAirplayState("unsupported");
        setErrorMessage("webkitShowPlaybackTargetPicker() ist nicht verfügbar.");
      }
    } catch (e) {
      console.error("AirPlay-Fehler:", e);
      setAirplayState("error");
      setErrorMessage(`Fehler beim Starten: ${e instanceof Error ? e.message : "Unbekannt"}`);
    }
  };

  // AirPlay beenden
  const handleStopAirPlay = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setAirplayState("idle");
  };

  return (
    <div
      className="host-screen"
      style={{
        position: "fixed",
        inset: 0,
        background: "blue",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      {/* Verstecktes Canvas für Rendering */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {/* Videoelement für AirPlay-Ausgabe */}
      <video
        ref={videoRef}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "200px",
          height: "112px",
          borderRadius: "8px",
          border: "2px solid rgba(255,255,255,0.3)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          background: "#000",
        }}
        playsInline
        muted
        controls={false}
        autoPlay={false}
      />

      {/* Steuerung */}
      <div style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "2rem",
        maxWidth: "400px",
        width: "100%",
        color: "white",
        textAlign: "center",
      }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem", fontWeight: 600 }}>
          Virtual Display
        </h1>

        <p style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: "1.5rem" }}>
          iPad-Anzeige: Blau<br />
          AirPlay-Ausgabe: Schwarz
        </p>

        {airplayState === "idle" && (
          <button
            onClick={handleStartAirPlay}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            AirPlay starten
          </button>
        )}

        {airplayState === "connecting" && (
          <div style={{
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.1)",
            color: "white",
          }}>
            <div style={{
              width: "24px",
              height: "24px",
              border: "3px solid rgba(255,255,255,0.3)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 0.5rem",
            }} />
            Verbinde...
          </div>
        )}

        {airplayState === "active" && (
          <div>
            <div style={{
              padding: "1rem",
              borderRadius: "12px",
              background: "rgba(34, 197, 94, 0.2)",
              border: "1px solid rgba(34, 197, 94, 0.5)",
              marginBottom: "1rem",
              color: "#22c55e",
              fontWeight: 600,
            }}>
              ✓ AirPlay aktiv
            </div>
            <button
              onClick={handleStopAirPlay}
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "12px",
                background: "rgba(239, 68, 68, 0.8)",
                color: "white",
                border: "none",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              AirPlay beenden
            </button>
          </div>
        )}

        {airplayState === "unsupported" && (
          <div style={{
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(251, 191, 36, 0.2)",
            border: "1px solid rgba(251, 191, 36, 0.5)",
            color: "#fbbf24",
            fontSize: "0.9rem",
          }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              AirPlay nicht verfügbar
            </p>
            <p style={{ opacity: 0.8, fontSize: "0.85rem" }}>
              {errorMessage || "webkitShowPlaybackTargetPicker() wird von diesem Browser/Gerät nicht unterstützt."}
            </p>
          </div>
        )}

        {airplayState === "error" && (
          <div style={{
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.5)",
            color: "#ef4444",
            fontSize: "0.9rem",
          }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              Fehler
            </p>
            <p style={{ opacity: 0.8, fontSize: "0.85rem" }}>
              {errorMessage}
            </p>
            <button
              onClick={() => {
                setAirplayState("idle");
                setErrorMessage("");
              }}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.05)",
          fontSize: "0.8rem",
          opacity: 0.7,
          lineHeight: 1.5,
        }}>
          <strong>Technischer Hinweis:</strong><br />
          Diese Implementierung versucht, ein separates Videoelement über die WebKit AirPlay API zu übertragen.
          Ob iPadOS Safari dies als eigenständige Ausgabe (ohne Screen Mirroring) behandelt, muss auf dem Gerät getestet werden.
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
