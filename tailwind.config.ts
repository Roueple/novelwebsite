import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable dark mode
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      backgroundColor: {
        'gray-700': '#374151',
        'gray-800': '#1f2937',
        'gray-900': '#111827',
        'blue-600': '#2563eb',
        'blue-700': '#1d4ed8',
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