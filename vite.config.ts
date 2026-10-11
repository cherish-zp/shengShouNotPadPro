import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        // 三方依赖拆 chunk：CodeMirror 全家桶（@codemirror/* + @lezer/*）、
        // React 全家桶（react/react-dom/scheduler）各自单独成 chunk，
        // 其余 node_modules 进 vendor，避免主 index chunk 过大（原为 1.33MB 单文件）
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@codemirror") || id.includes("@lezer")) return "codemirror";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          return "vendor";
        },
      },
    },
  },
});
