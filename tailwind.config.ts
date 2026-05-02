import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F2EDE3',
          300: '#E8DFCF',
        },
        clay: {
          50: '#FDF4EE',
          100: '#FAE5D5',
          200: '#F2C5A0',
          300: '#E89F6A',
          400: '#D67940',
          500: '#B85C38',
          600: '#9A4A2C',
          700: '#7C3B23',
          800: '#5E2D1B',
          900: '#3F1F12',
        },
        slate: {
          50: '#F8F8F7',
          100: '#EFEFED',
          200: '#D9D9D6',
          300: '#B3B3AE',
          400: '#8C8C86',
          500: '#66665F',
          600: '#4D4D47',
          700: '#33332F',
          800: '#222220',
          900: '#1A1A18',
        },
        sage: {
          100: '#E8EDE3',
          200: '#C9D4BC',
          300: '#A3B68F',
          400: '#7A9462',
          500: '#5A7548',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-plex)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 12px rgba(26, 26, 24, 0.04)',
        card: '0 1px 0 rgba(26, 26, 24, 0.04), 0 1px 3px rgba(26, 26, 24, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
