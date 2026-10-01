import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
