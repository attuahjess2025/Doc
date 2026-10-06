/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        elda: {
          burgundy: '#7A1C1C',
          'burgundy-dark': '#581212',
          'burgundy-light': '#9E2626',
          gold: '#C59B27',
          'gold-light': '#E8CA65',
          'gold-bg': '#FDF9EE',
          cream: '#FAF9F6',
        }
      }
    },
  },
  plugins: [],
}
