import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    // Proxy /gs -> your Google Apps Script webapp to avoid CORS in development
    proxy: {
      '^/gs': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gs/,'/macros/s/AKfycbxKkPJXgVBjH1MtLa5h1064bJj-VzVjcToaHC1JAN5N_F4bFy87bj5SeWisu4UaYCUP7Q/exec')
      }
    }
  }
})
