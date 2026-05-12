import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4173",
    },
  },
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        "dingo-widget": "src/dingo-widget.jsx",
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "dingo-widget" ? "dingo-widget.js" : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
