// tailwind.config.ts
// REMOVED extraneous characters/words from the beginning of the file.
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
        border: 'var(--border)', // [cite: 306]
        input: 'var(--input)', // [cite: 306]
        ring: 'var(--ring)', // [cite: 306]
        background: 'var(--background)', // Correct: Use the variable directly // [cite: 306]
        foreground: 'var(--foreground)', // Correct: Use the variable directly // [cite: 306]
        primary: {
          DEFAULT: 'var(--primary)', // Correct: Use the variable directly // [cite: 306]
          foreground: 'var(--primary-foreground)', // Correct: Use the variable directly // [cite: 307]
        },
        secondary: {
          DEFAULT: 'var(--secondary)', // Correct: Use the variable directly // [cite: 307]
          foreground: 'var(--secondary-foreground)', // Correct: Use the variable directly // [cite: 307]
        },
        destructive: {
          DEFAULT: 'var(--destructive)', // Correct: Use the variable directly // [cite: 307]
          foreground: 'var(--destructive-foreground)', // Correct: Use the variable directly // [cite: 308]
        },
        muted: {
          DEFAULT: 'var(--muted)', // Correct: Use the variable directly // [cite: 308]
          foreground: 'var(--muted-foreground)', // Correct: Use the variable directly // [cite: 308]
        },
        accent: {
          DEFAULT: 'var(--accent)', // Correct: Use the variable directly // [cite: 308]
          foreground: 'var(--accent-foreground)', // Correct: Use the variable directly // [cite: 309]
        },
        popover: {
          DEFAULT: 'var(--popover)', // Correct: Use the variable directly // [cite: 309]
          foreground: 'var(--popover-foreground)', // Correct: Use the variable directly // [cite: 309]
        },
        card: {
          DEFAULT: 'var(--card)', // Correct: Use the variable directly // [cite: 309]
          foreground: 'var(--card-foreground)', // Correct: Use the variable directly // [cite: 310]
        },
        // Make sure reading theme colors also use var() if defined here
         reading: {
           background: 'var(--reading-background)', // Use var() // [cite: 310]
           foreground: 'var(--reading-foreground)', // Use var() // [cite: 310]
           muted: 'var(--reading-muted)', // Use var() // [cite: 310]
           accent: 'var(--reading-accent)', // Use var() // [cite: 311]
         }
        // --- End Corrected Section ---
      },
      fontFamily: {
        // Font families remain the same
        sans: ['var(--font-open-sans)', 'sans-serif'], // [cite: 311]
        serif: ['var(--font-merriweather)', 'serif'], // [cite: 311]
        'roboto-slab': ['var(--font-roboto-slab)'], // [cite: 312]
        'libre-baskerville': ['var(--font-libre-baskerville)'], // [cite: 312]
        'source-sans': ['var(--font-source-sans)'], // [cite: 312]
      },
      borderRadius: {
        lg: 'var(--radius)', // [cite: 312]
        md: 'calc(var(--radius) - 2px)', // [cite: 312]
        sm: 'calc(var(--radius) - 4px)' // [cite: 312]
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" }, }, // [cite: 312]
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" }, }, // [cite: 313]
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out", // [cite: 313]
        "accordion-up": "accordion-up 0.2s ease-out", // [cite: 313]
      },
      typography: (theme: any) => ({
         DEFAULT: { css: { /* ... existing typography styles ... */ } }, // [cite: 313]
      }),
    } // [cite: 314]
  },
  plugins: [
    require("tailwindcss-animate"), // [cite: 314]
    require('@tailwindcss/typography'), // [cite: 314]
  ],
};
export default config; // [cite: 314]