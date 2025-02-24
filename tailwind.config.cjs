/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        truefa: {
          // Light gray with slight blue tint
          light: '#D2D9DC',
          // Light blue
          sky: '#C9E7F8',
          // Medium blue
          blue: '#76A3C7',
          // Darker blue
          navy: '#6489A7',
          // Dark gray
          gray: '#494F53',
          // Almost black
          dark: '#1A1A1A',
        },
      },
      animation: {
        'fade-out': 'fadeOut 2s ease-in-out forwards',
      },
      keyframes: {
        fadeOut: {
          '0%': { opacity: '1' },
          '75%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
} 