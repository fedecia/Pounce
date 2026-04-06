/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,svelte}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#f0f9ff', 400: '#38bdf8', 600: '#0284c7', 900: '#0c4a6e' }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}