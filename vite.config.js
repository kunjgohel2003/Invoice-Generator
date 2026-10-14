import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import apiPlugin from "./api/index.js";

export default defineConfig({
  plugins: [react(), apiPlugin()],
});
