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
          dark: '#002D4C',
          900: '#001a2b',
        },
        'co-red': {
          primary: '#DA0025',
          secondary: '#FF0033',
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
          900: '#0A0E11',
          950: '#05070a'
        },
        'premium': {
          'gold': '#D4AF37',
          'silver': '#C0C0C0',
          'slate': '#1e293b',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'premium': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      }
    }
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
