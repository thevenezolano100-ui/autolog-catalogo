import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Esto obliga al navegador a descargar toda la interfaz visual para uso offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Rosa Store - AutoLog POS',
        short_name: 'RosaStore',
        description: 'Punto de Venta B2B y Catálogo Offline',
        theme_color: '#0f172a', // Color oscuro elegante para la barra superior
        background_color: '#f8fafc',
        display: 'standalone', // Hace que se vea como una app nativa sin la barra de Chrome
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/vite.svg', // Usamos el logo por defecto de Vite por ahora
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})