/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          500: '#3b6cf6',
          600: '#2754dc',
          700: '#1d42b3',
        },
      },
    },
  },
  plugins: [],
};
