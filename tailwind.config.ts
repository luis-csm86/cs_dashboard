/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#d9e7ff',
          200: '#bcd4ff',
          300: '#8eb6ff',
          400: '#598dff',
          500: '#3366ff',
          600: '#1a44f5',
          700: '#1232e1',
          800: '#1529b6',
          900: '#172890',
        },
      },
    },
  },
  plugins: [],
}
