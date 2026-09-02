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
        brand: {
          blue: '#0066CC',
          'blue-dark': '#004C99',
          'blue-light': '#EBF4FF',
          orange: '#F58220',
          'orange-dark': '#D96B0F',
          'orange-light': '#FFF5EB',
          navy: '#0A2540',
        },
        navy: {
          950: '#071324',
          900: '#0A2540',
          800: '#13395E',
          700: '#0066CC',
          600: '#1D72D6',
          500: '#3B82F6',
          100: '#E0EEFB',
          50: '#F0F7FD',
        },
        terracotta: {
          700: '#C2410C',
          600: '#EA580C',
          500: '#F58220',
          400: '#FB923C',
          100: '#FFEBD9',
          50: '#FFF7EE',
        },
        civic: {
          red: '#EF4444',
          amber: '#F59E0B',
          green: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
