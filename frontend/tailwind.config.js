/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        neutralBg: '#f5f5f5',
        neutralSurface: '#ffffff',
        accent: {
          DEFAULT: '#3b82f6', // soft blue accent
        },
      },
      boxShadow: {
        card: '0 4px 14px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
