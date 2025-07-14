/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  corePlugins: {
    preflight: true,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF0F0',
          100: '#FFE0E0',
          200: '#FFBDBD',
          300: '#FF8A8A',
          400: '#FF6B6B',
          500: '#FF3B3B',
          600: '#F31515',
          700: '#C60D0D',
          800: '#9E0B0B',
          900: '#760808',
          DEFAULT: '#FF6B6B',
        },
        secondary: {
          50: '#E8F9F8',
          100: '#D4F4F2',
          200: '#ABE9E5',
          300: '#82DED8',
          400: '#59D3CB',
          500: '#4ECDC4',
          600: '#37B8AF',
          700: '#2B8F88',
          800: '#1F6661',
          900: '#133D3A',
          DEFAULT: '#4ECDC4',
        },
        background: {
          light: '#F7F7F7',
          dark: '#111827',
          DEFAULT: '#F7F7F7',
        },
        text: {
          light: '#333333',
          dark: '#F9FAFB',
          DEFAULT: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Remove the following overrides as they're not needed and might conflict
      // with the color definitions above
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
  // Ensure all color variants are generated
  safelist: [
    'bg-primary-400',
    'hover:bg-primary-500',
    'dark:bg-primary-500',
    'dark:hover:bg-primary-600',
    'text-white'
  ]
}
