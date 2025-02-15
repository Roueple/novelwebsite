import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        merriweather: ['var(--font-merriweather)'],
        'roboto-slab': ['var(--font-roboto-slab)'],
        'libre-baskerville': ['var(--font-libre-baskerville)'],
        'source-sans': ['var(--font-source-sans)'],
        'open-sans': ['var(--font-open-sans)'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;