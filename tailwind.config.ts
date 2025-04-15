// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // --- Ensure this is the structure you have ---
        // Use var() directly, because the CSS variable already contains hsl()
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)', // Correct: Use the variable directly
        foreground: 'var(--foreground)', // Correct: Use the variable directly
        primary: {
          DEFAULT: 'var(--primary)', // Correct: Use the variable directly
          foreground: 'var(--primary-foreground)', // Correct: Use the variable directly
        },
        secondary: {
          DEFAULT: 'var(--secondary)', // Correct: Use the variable directly
          foreground: 'var(--secondary-foreground)', // Correct: Use the variable directly
        },
        destructive: {
          DEFAULT: 'var(--destructive)', // Correct: Use the variable directly
          foreground: 'var(--destructive-foreground)', // Correct: Use the variable directly
        },
        muted: {
          DEFAULT: 'var(--muted)', // Correct: Use the variable directly
          foreground: 'var(--muted-foreground)', // Correct: Use the variable directly
        },
        accent: {
          DEFAULT: 'var(--accent)', // Correct: Use the variable directly
          foreground: 'var(--accent-foreground)', // Correct: Use the variable directly
        },
        popover: {
          DEFAULT: 'var(--popover)', // Correct: Use the variable directly
          foreground: 'var(--popover-foreground)', // Correct: Use the variable directly
        },
        card: {
          DEFAULT: 'var(--card)', // Correct: Use the variable directly
          foreground: 'var(--card-foreground)', // Correct: Use the variable directly
        },
        // Make sure reading theme colors also use var() if defined here
         reading: {
           background: 'var(--reading-background)', // Use var()
           foreground: 'var(--reading-foreground)', // Use var()
           muted: 'var(--reading-muted)',          // Use var()
           accent: 'var(--reading-accent)',        // Use var()
         }
        // --- End Corrected Section ---
      },
      fontFamily: {
        // Font families remain the same
        sans: ['var(--font-open-sans)', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'serif'],
        'roboto-slab': ['var(--font-roboto-slab)'],
        'libre-baskerville': ['var(--font-libre-baskerville)'],
        'source-sans': ['var(--font-source-sans)'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" }, },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" }, },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: (theme: any) => ({
         DEFAULT: { css: { /* ... existing typography styles ... */ } },
      }),
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
};
export default config;