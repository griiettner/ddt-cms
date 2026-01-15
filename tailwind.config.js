/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        'co-blue': {
          DEFAULT: '#004879',
          hover: '#003456',
          light: '#0076C0',
        },
        'co-red': {
          DEFAULT: '#DA0025',
          hover: '#B5001E',
        },
        'co-gray': {
          50: '#F7F8F9',
          100: '#EAECED',
          500: '#9CA5AF',
          700: '#69747F',
          900: '#3D4551',
        },
        success: '#00A758',
        warning: '#FF9E1B',
        error: '#DA0025',
        info: '#0076C0',
      },
      fontFamily: {
        sans: [
          'Optimist',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
