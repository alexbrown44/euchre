import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The engine lives next to the app (../engine), so the dev server may read files there.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
