/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tesla: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a4bcfd',
          400: '#8199fa',
          500: '#6172f3',
          600: '#4d5ee6',
          700: '#4047cc',
          800: '#363ca5',
          900: '#313982',
          950: '#1e204e',
        },
      },
    },
  },
  plugins: [],
};
