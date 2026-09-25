/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        posyandu: {
          teal: '#0d9488',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
