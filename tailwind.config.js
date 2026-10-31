/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#14213d',
        brand: { 50: '#eef5ff', 100: '#d9e8ff', 500: '#1f5fbf', 600: '#184c9a', 700: '#123a77' },
      },
    },
  },
  plugins: [],
};
