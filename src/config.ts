/**
 * Zentrale Konfiguration für die virtuelle Bildschirmübertragung.
 * 
 * Ändern Sie `displayImage`, um das angezeigte Bild auszutauschen.
 * Das Bild wird auf der Zuschaueransicht und über AirPlay übertragen.
 */

export interface DisplayConfig {
  /** Pfad zum anzuzeigenden Bild */
  displayImage: string;
  /** Hintergrundfarbe, wenn das Bild den Bildschirm nicht vollständig ausfüllt */
  displayBackground: string;
  /** Steuerungsbuttons auf der Zuschaueransicht anzeigen */
  showControls: boolean;
  /** Wie das Bild skaliert werden soll: "contain" (vollständig sichtbar) oder "cover" (ausfüllend) */
  fit: "contain" | "cover";
}

export const CONFIG: DisplayConfig = {
  displayImage: "https://picsum.photos/1920/1080?random=1",
  displayBackground: "#000000",
  showControls: false,
  fit: "contain",
};
