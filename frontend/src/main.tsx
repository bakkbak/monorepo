import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./app/App.tsx";
import "./styles/index.css";

// Native shell bootstrap: tint the status bar to match the yellow header and
// hand off from the native splash to the in-app SplashScreen component. Dynamic
// imports keep these plugins out of the web bundle's critical path.
if (Capacitor.isNativePlatform()) {
  void (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      // Header is yellow-400 with black content, so use dark (black) icons.
      await StatusBar.setStyle({ style: Style.Light });
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#FACC15" });
      }
    } catch {
      // Status bar plugin unavailable — non-fatal.
    }
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();
    } catch {
      // Splash plugin unavailable — non-fatal.
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
