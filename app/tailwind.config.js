/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0d12', 900: '#0f131a', 850: '#141922', 800: '#1a2029',
          700: '#262e3a', 600: '#364152', 500: '#4b5768', 400: '#6b7789',
          300: '#97a2b3', 200: '#c3cad5', 100: '#e4e8ee',
        },
        brand: { 50: '#eaf2fb', 100: '#cfe1f5', 300: '#6aa6e3', 400: '#3a87d6', 500: '#0b6bc4', 600: '#0055a5', 700: '#004283', 800: '#002b5c', 900: '#001b3a' },
        gold: { 300: '#ecd58a', 400: '#e0c062', 500: '#d4af37', 600: '#b08f24' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
