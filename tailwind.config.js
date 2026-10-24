/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        muz: {
          bg: '#0b0d14',
          panel: '#151821',
          panelStrong: '#1a1e2b',
          accent: '#8b6cff',
          accentStrong: '#7454f5',
          warning: '#ffb454',
          danger: '#ff5d73',
          text: '#edf2ff',
          muted: '#9aa3b8',
        },
      },
      boxShadow: {
        glow: '0 0 25px rgba(139, 108, 255, 0.28)',
      },
    },
  },
  plugins: [],
};
