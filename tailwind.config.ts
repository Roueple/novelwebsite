import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        reading: {
          accent: 'var(--reading-accent)',
          muted: 'var(--reading-muted)',
          bg: '#F5E6D3',
          text: '#2C3E50',
        }
      },
      backgroundColor: {
        'gray-700': '#374151',
        'gray-800': '#1f2937',
        'gray-900': '#111827',
        'blue-600': '#2563eb',
        'blue-700': '#1d4ed8',
        'crimson-700': '#991b1b',
        'crimson-800': '#7f1d1d',
        'crimson-900': '#680e0e',
      },
      textColor: {
        'gray-200': '#e5e7eb',
        'gray-300': '#d1d5db',
        'gray-400': '#9ca3af',
        'gray-500': '#6b7280',
        'gray-600': '#4b5563',
        'gray-700': '#374151',
        'gray-800': '#1f2937',
        'gray-900': '#111827',
      },
      borderColor: {
        'gray-300': '#d1d5db',
        'gray-600': '#4b5563',
        'crimson-600': '#b91c1c',
        'crimson-700': '#991b1b',
      },
      zIndex: {
        '10': '10',
        '50': '50',
      },
    },
  },
  plugins: [],
};

export default config;