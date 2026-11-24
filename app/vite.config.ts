import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Tek dosya çıktısı: dist/index.html çift tıklayınca açılır, sunucu gerekmez.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
})
