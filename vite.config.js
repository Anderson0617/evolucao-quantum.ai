import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/evolucao-quantum.ai/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
