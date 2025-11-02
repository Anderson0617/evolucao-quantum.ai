import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function warnAbsoluteAsset() {
  const patterns = [
    { name: "CSS url() absoluto", regex: /url\((['"])\/[^)]+?\1\)/g },
    { name: "Atributo src= absoluto", regex: /\bsrc\s*=\s*(['"])\/[^"']*?\1/g },
    { name: "Atributo href= absoluto", regex: /\bhref\s*=\s*(['"])\/[^"']*?\1/g },
  ];

  return {
    name: "warn-absolute-asset",
    enforce: "pre",
    transform(code, id) {
      if (!/src\/|public\//.test(id)) {
        return null;
      }
      const hits = [];
      for (const { name, regex } of patterns) {
        let match;
        while ((match = regex.exec(code))) {
          hits.push(`${name} @ index ${match.index}`);
        }
      }
      if (hits.length > 0) {
        this.warn(`[BASE_URL] ${id}\n  ${hits.join("\n  ")}`);
      }
      return null;
    },
  };
}

export default defineConfig(({ command }) => {
  const isDev = command === "serve";
  return {
    base: isDev ? "/" : "/evolucao-quantum.ai/",
    plugins: [react(), warnAbsoluteAsset()],
    build: {
      // Phaser fica em chunk separado; elevamos o limite para evitar warning.
      chunkSizeWarningLimit: 1600,
    },
  };
});
