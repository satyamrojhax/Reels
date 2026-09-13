import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  // Vite 8+ natively supports tsconfig path aliases — no plugin needed
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    target: "esnext",
    // Use Vite 8's native oxc minifier (esbuild is no longer bundled by default)
    minify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manually split vendor chunks for better long-term CDN caching
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "tanstack-vendor";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "radix-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons-vendor";
          }
        },
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  // Optimise pre-bundling to speed up cold dev starts
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "lucide-react",
      "canvas-confetti",
    ],
  },
});
