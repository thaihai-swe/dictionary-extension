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
        paper: 'var(--bg-paper, #fafaf7)',
        surface: 'var(--bg-surface, #ffffff)',
        elevated: 'var(--bg-elevated, #f4f4ef)',
        muted: 'var(--bg-muted, #ebebe4)',
        hover: 'var(--bg-hover, #e2e2d9)',
        border: {
          DEFAULT: 'var(--border-color, #e2e2d9)',
          subtle: 'var(--border-subtle, #ecece5)',
        },
        content: {
          DEFAULT: 'var(--text-primary, #18181b)',
          secondary: 'var(--text-secondary, #52525b)',
          muted: 'var(--text-muted, #71717a)',
          disabled: 'var(--text-disabled, #a1a1aa)',
        },
        dark: {
          paper: 'var(--bg-paper, #090a0d)',
          surface: 'var(--bg-surface, #101319)',
          elevated: 'var(--bg-elevated, #171b23)',
          muted: 'var(--bg-muted, #1e232e)',
          border: 'var(--border-color, #222735)',
        }
      },
      textColor: {
        content: 'var(--text-primary, #18181b)',
        primary: 'var(--text-primary, #18181b)',
        secondary: 'var(--text-secondary, #52525b)',
        muted: 'var(--text-muted, #71717a)',
      },
      backgroundColor: {
        paper: 'var(--bg-paper)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        muted: 'var(--bg-muted)',
        hover: 'var(--bg-hover)',
      },
      borderColor: {
        DEFAULT: 'var(--border-color)',
        subtle: 'var(--border-subtle)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['Georgia', '"Times New Roman"', 'serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(212, 175, 55, 0.28)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)',
        'card': 'var(--shadow-card, 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08))',
        'card-elevated': 'var(--shadow-elevated, 0 2px 8px -2px rgba(15, 23, 42, 0.08), 0 12px 32px -16px rgba(15, 23, 42, 0.16))',
      }
    },
  },
  plugins: [],
}
