import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// three.js ships in its own chunk, loaded only when the research flight starts.
export default defineConfig({ plugins: [react()], base: './', build: { chunkSizeWarningLimit: 700 } });
