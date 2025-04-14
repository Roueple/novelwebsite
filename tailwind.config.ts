// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'], // Use class-based dark mode
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: { // Optional: Define container defaults
      center: true,
      padding: '1rem', // Default padding
      screens: {
        '2xl': '1400px',
      },
    },
  	extend: {
      // Define colors using CSS variables defined in globals.css
  		colors: {
  			border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Keep reading theme specific colors if needed for utility classes
        // but prefer applying the .reading class for context
        reading: {
          background: 'hsl(var(--reading-background))', // Use semantic var
          foreground: 'hsl(var(--reading-foreground))',
          muted:      'hsl(var(--reading-muted))',
          accent:     'hsl(var(--reading-accent))',
        }
  		},
      // Define font families using CSS variables from layout.tsx
      fontFamily: {
        sans: ['var(--font-open-sans)', 'sans-serif'], // Example default sans
        serif: ['var(--font-merriweather)', 'serif'], // Example default serif
        'roboto-slab': ['var(--font-roboto-slab)'],
        'libre-baskerville': ['var(--font-libre-baskerville)'],
        'source-sans': ['var(--font-source-sans)'],
        // Add other fonts here
      },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
      keyframes: {
        // Keep shadcn/ui keyframes if needed
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Add your custom keyframes from globals.css IF they are not purely for effects
        // (Effects keyframes should stay in globals.css with their effect classes)
      },
      animation: {
        // Keep shadcn/ui animations if needed
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Add custom animations here IF needed system-wide
      },
      // Add typography plugin for prose styling base
      typography: (theme: any) => ({
        DEFAULT: {
          css: {
            // Base prose styles - will be overridden by theme variables
            color: theme('colors.foreground'), // Use theme foreground
            a: {
              color: theme('colors.primary.DEFAULT'), // Use theme primary
              '&:hover': {
                color: theme('colors.primary.DEFAULT / 90%'),
              },
            },
            // Add other base styles as needed (headings, lists, etc.)
             '--tw-prose-body': 'hsl(var(--foreground))',
             '--tw-prose-headings': 'hsl(var(--foreground))',
             '--tw-prose-lead': 'hsl(var(--muted-foreground))',
             '--tw-prose-links': 'hsl(var(--primary))',
             '--tw-prose-bold': 'hsl(var(--foreground))',
             '--tw-prose-counters': 'hsl(var(--muted-foreground))',
             '--tw-prose-bullets': 'hsl(var(--muted-foreground))',
             '--tw-prose-hr': 'hsl(var(--border))',
             '--tw-prose-quotes': 'hsl(var(--foreground))',
             '--tw-prose-quote-borders': 'hsl(var(--border))',
             '--tw-prose-captions': 'hsl(var(--muted-foreground))',
             '--tw-prose-code': 'hsl(var(--foreground))',
             '--tw-prose-pre-code': 'hsl(var(--card-foreground))', // Code block text
             '--tw-prose-pre-bg': 'hsl(var(--card))', // Code block bg
             '--tw-prose-th-borders': 'hsl(var(--border))',
             '--tw-prose-td-borders': 'hsl(var(--border))',
             // Dark mode overrides (applied by .dark class)
             '--tw-prose-invert-body': 'hsl(var(--foreground))',
             '--tw-prose-invert-headings': 'hsl(var(--foreground))',
             '--tw-prose-invert-lead': 'hsl(var(--muted-foreground))',
             '--tw-prose-invert-links': 'hsl(var(--primary))',
             // ... map other invert variables ...
             '--tw-prose-invert-pre-code': 'hsl(var(--card-foreground))',
             '--tw-prose-invert-pre-bg': 'hsl(var(--card))',
          },
        },
        // Define variants if needed (e.g., prose-sm, prose-lg)
      }),
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'), // Add typography plugin
  ],
};

export default config;