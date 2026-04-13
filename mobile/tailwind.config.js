/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './business/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Two extra small text sizes — beyond Tailwind's default `text-xs`
      // (12px) for the dense badges/captions/logo labels used across
      // the customer app. Replaces the inline `text-[10px]` /
      // `text-[11px]` magic numbers that had crept into components.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }], // 11 / 14
        '3xs': ['0.625rem', { lineHeight: '0.75rem' }],   // 10 / 12
      },
      colors: {
        // The app-wide page background. Referenced as `bg-page`.
        page: '#FFFFFF',

        // Official Stamply brand blue — derived from the Stamply logo.
        // Keep in sync with the merchant web `web/src/index.css` so the
        // mobile app and the dashboard read as the same brand.
        brand: {
          DEFAULT: '#eb592e',
          50: '#FEF0EB',
          100: '#FCDACD',
          500: '#eb592e',
          600: '#D44A22',
          700: '#B03B1A',
          900: '#7A2912',
        },
        stamp: {
          filled: '#eb592e',
          empty: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};
