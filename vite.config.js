import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <--- Make sure this is here

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- Make sure this function is called here
  ],
})