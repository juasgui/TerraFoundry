/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        foundry: {
          bg:         '#0a0d14',
          surface:    '#0f1520',
          panel:      '#141824',
          card:       '#1a2030',
          border:     '#1e2d3d',
          hover:      '#232d40',
          accent:     '#00d4ff',
          'accent-dim': '#005f73',
          green:      '#00ff9d',
          yellow:     '#ffcc00',
          orange:     '#ff8c00',
          red:        '#ff3a3a',
          purple:     '#a78bfa',
          text:       '#e2e8f0',
          'text-dim': '#94a3b8',
          muted:      '#64748b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
