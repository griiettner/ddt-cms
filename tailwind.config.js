/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
          200: '#D1D5DB',
          300: '#9CA5AF',
          500: '#9CA5AF',
          600: '#727b84',
          700: '#69747F',
          900: '#3D4551',
        },
        success: {
          DEFAULT: '#00A758',
          light: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#FF9E1B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#DA0025',
          light: '#FEE2E2',
        },
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
      borderRadius: {
        '12': '12px',
      },
    },
  },
  plugins: [],
};
