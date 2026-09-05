function withOpacity(cssVar, rgbVar) {
  return ({ opacityVariable, opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${rgbVar}), ${opacityValue})`;
    }
    if (opacityVariable !== undefined) {
      return `rgba(var(${rgbVar}), var(${opacityVariable}, 1))`;
    }
    return `var(${cssVar})`;
  };
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./options.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fcfcfb',
          100: '#f8f8f5',
          200: '#f1f1ec',
          300: '#e5e5dc',
          400: '#d2d2c5',
          500: '#a3a392',
          600: '#737363',
          700: '#505044',
          800: '#313129',
          900: '#191915',
        },
        gold: {
          50: '#fbf4d8',
          100: '#f3e29f',
          200: '#e6ca65',
          300: '#d4af37',
          400: '#c9a227',
          500: '#b8860b',
        },
        paper: withOpacity('--bg-paper', '--bg-paper-rgb'),
        surface: withOpacity('--bg-surface', '--bg-surface-rgb'),
        elevated: withOpacity('--bg-elevated', '--bg-elevated-rgb'),
        muted: withOpacity('--bg-muted', '--bg-muted-rgb'),
        hover: withOpacity('--bg-hover', '--bg-hover-rgb'),
        border: {
          DEFAULT: withOpacity('--border-color', '--border-color-rgb'),
          subtle: withOpacity('--border-subtle', '--border-subtle-rgb'),
        },
        content: {
          DEFAULT: withOpacity('--text-primary', '--text-primary-rgb'),
          secondary: withOpacity('--text-secondary', '--text-secondary-rgb'),
          muted: withOpacity('--text-muted', '--text-muted-rgb'),
          disabled: withOpacity('--text-disabled', '--text-disabled-rgb'),
        },
        accent: {
          DEFAULT: withOpacity('--color-primary', '--color-primary-rgb'),
          hover: 'var(--color-primary-hover, #0f766e)',
          light: 'var(--color-primary-light, rgba(13, 148, 136, 0.12))',
          subtle: 'var(--color-primary-light, rgba(13, 148, 136, 0.08))',
        },
      },
      textColor: {
        content: withOpacity('--text-primary', '--text-primary-rgb'),
        primary: withOpacity('--text-primary', '--text-primary-rgb'),
        secondary: withOpacity('--text-secondary', '--text-secondary-rgb'),
        muted: withOpacity('--text-muted', '--text-muted-rgb'),
        accent: withOpacity('--color-primary', '--color-primary-rgb'),
      },
      backgroundColor: {
        paper: withOpacity('--bg-paper', '--bg-paper-rgb'),
        surface: withOpacity('--bg-surface', '--bg-surface-rgb'),
        elevated: withOpacity('--bg-elevated', '--bg-elevated-rgb'),
        muted: withOpacity('--bg-muted', '--bg-muted-rgb'),
        hover: withOpacity('--bg-hover', '--bg-hover-rgb'),
        accent: withOpacity('--color-primary', '--color-primary-rgb'),
      },
      borderColor: {
        DEFAULT: withOpacity('--border-color', '--border-color-rgb'),
        subtle: withOpacity('--border-subtle', '--border-subtle-rgb'),
        accent: withOpacity('--color-primary', '--color-primary-rgb'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        heading: ['Charter', '"Bitstream Charter"', '"Sitka Text"', 'Cambria', 'Georgia', 'serif'],
        serif: ['Charter', '"Bitstream Charter"', '"Sitka Text"', 'Cambria', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'glow-gold': '0 0 24px -2px rgba(212, 175, 55, 0.3)',
        'glow-teal': '0 0 24px -2px rgba(13, 148, 136, 0.25)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
        'card': 'var(--shadow-card, 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08))',
        'card-elevated': 'var(--shadow-elevated, 0 2px 8px -2px rgba(15, 23, 42, 0.08), 0 12px 32px -16px rgba(15, 23, 42, 0.16))',
      }
    },
  },
  plugins: [],
}
