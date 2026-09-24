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
    "./src/wxt-entrypoints/**/*.{html,ts,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
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
          foreground: 'var(--color-on-primary, #ffffff)',
          light: 'var(--color-primary-light, rgba(13, 148, 136, 0.12))',
          subtle: 'var(--color-primary-light, rgba(13, 148, 136, 0.08))',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
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
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        heading: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        xs: ['0.9375rem', { lineHeight: '1.4375rem' }],
        sm: ['1.0625rem', { lineHeight: '1.625rem' }],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      spacing: {
        component: 'var(--spacing-card)',
        section: 'var(--spacing-section)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
        'card': 'var(--shadow-card, 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.04))',
        'card-elevated': 'var(--shadow-elevated, 0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -3px rgba(0, 0, 0, 0.05))',
        'glow-accent': '0 0 20px -2px rgba(20, 184, 166, 0.35)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
};
