/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Vite будет сканировать все файлы
  ],
  darkMode: false,
  theme: {
    extend: {
      fontFamily: {
        brandFont: ["brandFont", "Kanit Cyrillic"],
      }
    },
  },
  plugins: [],
};