import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', 'class'],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			reading: {
  				accent: 'var(--reading-accent)',
  				muted: 'var(--reading-muted)',
  				bg: '#F5E6D3',
  				text: '#2C3E50'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
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
  			'crimson-900': '#680e0e'
  		},
  		textColor: {
  			'gray-200': '#e5e7eb',
  			'gray-300': '#d1d5db',
  			'gray-400': '#9ca3af',
  			'gray-500': '#6b7280',
  			'gray-600': '#4b5563',
  			'gray-700': '#374151',
  			'gray-800': '#1f2937',
  			'gray-900': '#111827'
  		},
  		borderColor: {
  			'gray-300': '#d1d5db',
  			'gray-600': '#4b5563',
  			'crimson-600': '#b91c1c',
  			'crimson-700': '#991b1b'
  		},
  		zIndex: {
  			'10': '10',
  			'50': '50'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;