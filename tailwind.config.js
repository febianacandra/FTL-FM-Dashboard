/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Brand FTL — diambil dari logo (#27A8DF)
        brand: {
          50: '#EAF7FD', 100: '#CBEBFA', 200: '#98D7F5', 300: '#65C3F0',
          400: '#3FB2EA', 500: '#27A8DF', 600: '#1E86B4', 700: '#166389',
          800: '#0F415D', 900: '#082432',
        },
        surface: {
          DEFAULT: '#101827', // dasar profesional gelap-netral (bukan hitam pekat)
          alt: '#16202F',
          hi: '#1E2A3C',
          border: '#263447',
        },
        ink: { DEFAULT: '#EAF1F8', muted: '#8A9AB0', dim: '#5C6C82' },
        success: '#2FD98B',
        warning: '#FFB627',
        danger: '#FF4D5E',
      },
    },
  },
  plugins: [],
};
