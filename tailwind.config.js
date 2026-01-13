/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/**/*.html",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'co-blue': {
          primary: '#004879',
          secondary: '#0074BA',
          light: '#4A90E2',
          dark: '#002D4C'
        },
        'co-red': {
          primary: '#DA0025',
          secondary: '#FF0033'
        },
        'co-success': '#00A758',
        'co-warning': '#FDB71A',
        'co-gray': {
          50: '#F7F9FA',
          100: '#EFF3F5',
          200: '#DFE6EB',
          300: '#B8C5CE',
          400: '#8B9BA6',
          500: '#5F6F7A',
          600: '#4A5761',
          700: '#343F47',
          800: '#1F262B',
          900: '#0A0E11'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
