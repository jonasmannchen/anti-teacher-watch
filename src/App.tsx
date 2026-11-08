import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Host from "./pages/Host";
import View from "./pages/View";

/**
 * Hauptanwendung mit Routing.
 * Verwendet HashRouter für maximale Kompatibilität mit statischem Hosting.
 * 
 * /#/host - Steuerungsseite für den Übertragenden
 * /#/view - Zuschaueransicht (zeigt nur das konfigurierte Bild)
 */
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/host" replace />} />
        <Route path="/host" element={<Host />} />
        <Route path="/view" element={<View />} />
        <Route path="/view/:sessionId" element={<View />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
