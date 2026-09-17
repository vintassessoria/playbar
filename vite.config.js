import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173, open: false },
  build: {
    target: "es2020",
    // Three.js sozinho passa de 500 kB — o aviso padrão só faz ruído aqui.
    chunkSizeWarningLimit: 1200,
  },
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.hdr"],
});
