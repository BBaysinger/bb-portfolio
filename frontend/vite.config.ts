import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * https://vitejs.dev/config/
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": "/src", // Set up an alias
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // or "modern"
      },
    },
  },
  build: {
    outDir: "dist", // The output directory
    emptyOutDir: true, // Clears the output directory before each build
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true, // Ensures it binds to all network interfaces
    port: 5173, // Specify the port explicitly
  },
});
