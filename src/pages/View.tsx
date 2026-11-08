import { useEffect } from "react";

/**
 * Zuschaueransicht (View).
 * 
 * Zeigt einen vollständig SCHWARZEN Bildschirm.
 * Keine Bedienelemente, keine Navigation, keine Informationen.
 * 
 * Diese Seite kann auf einem zweiten Gerät geöffnet werden
 * oder als AirPlay-Empfängeransicht dienen.
 */
export default function View() {
  // Verhindere Kontextmenü und Textauswahl
  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  return (
    <div
      className="viewer-screen"
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        cursor: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    />
  );
}
