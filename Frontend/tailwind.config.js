/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      },
      boxShadow: {
        'modern': '0 10px 30px -10px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'modern-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.05)',
        'glow-sky': '0 0 25px -5px rgba(14, 165, 233, 0.35)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.35)'
      }
    },
  },
  plugins: [],
}
