import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode - using CSS variables from globals.css (hex values)
        'light-bg': '#e5e7eb',
        'light-card': 'var(--light-card)',
        'light-text-primary': 'var(--light-text-primary)',
        'light-text-secondary': 'var(--light-text-secondary)',
        'light-text-muted': 'var(--light-text-muted)',
        'light-border': '#f3f4f6', // Direct hex value - matches gray-100
        
        // Dark Mode - using CSS variables from globals.css (hex values)
        'dark-bg': 'var(--dark-bg)',
        'dark-surface': 'var(--dark-surface)',
        'dark-border': 'var(--dark-border)',
        'dark-hover': 'var(--dark-hover)',
        'dark-text-primary': 'var(--dark-text-primary)',
        'dark-text-secondary': 'var(--dark-text-secondary)',
        'dark-text-muted': 'var(--dark-text-muted)',
      },
    },
  },
  plugins: [],
};
export default config;

