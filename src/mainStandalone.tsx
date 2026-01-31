import { createRoot } from "react-dom/client";
import StandaloneApp from "./StandaloneApp";
import "./index.css";

// Standalone entry point - no Auth, no Router, no Supabase
createRoot(document.getElementById("root")!).render(<StandaloneApp />);
