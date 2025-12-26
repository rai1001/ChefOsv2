/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#111315', // Deep dark
        surface: '#1A1D1F',    // Dark card background
        primary: '#22c55e',    // Vibrant Green
        secondary: '#94a3b8',  // Slate 400
        accent: '#10b981',     // Emerald 500
        success: '#22c55e',    // Matching primary
        warning: '#f59e0b',    // Amber 500
        error: '#ef4444',      // Red 500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
