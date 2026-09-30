/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          surface1: 'var(--surface-1)',
          surface2: 'var(--surface-2)',
          contrast: 'var(--surface-contrast)'
        },
        border: 'var(--border)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          'on-contrast': 'var(--text-on-contrast)',
          'on-contrast-secondary': 'var(--text-on-contrast-secondary)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          secondary: 'var(--accent-secondary)',
          tertiary: 'var(--accent-tertiary)'
        },
        grad: {
          a: 'var(--grad-a)',
          b: 'var(--grad-b)',
          c: 'var(--grad-c)'
        },
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)'
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        full: '999px'
      },
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
        accent: 'var(--shadow-accent)',
        'glow-sm': 'var(--glow-sm)',
        'glow-md': 'var(--glow-md)'
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px'
      }
    }
  },
  plugins: []
}
