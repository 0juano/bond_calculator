import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initMonitoring } from "./lib/monitoring";

// Initialize monitoring before rendering app
initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
