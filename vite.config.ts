import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The 3D renderer is imported only when the introduction is opened.
export default defineConfig({ plugins: [react()], base: './', build: { chunkSizeWarningLimit: 700 } });
