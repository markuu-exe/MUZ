/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        muz: {
          bg: '#070b14',
          panel: '#101827',
          panelStrong: '#121d2e',
          accent: '#73e0a9',
          accentStrong: '#54d18c',
          warning: '#ffb454',
          danger: '#ff5d73',
          text: '#edf2ff',
          muted: '#9aa8bd',
        },
      },
      boxShadow: {
        glow: '0 0 25px rgba(115, 224, 169, 0.28)',
      },
    },
  },
  plugins: [],
};
