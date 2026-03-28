// const { createGlobPatternsForDependencies } = require('@nx/next/tailwind');

// The above utility import will not work if you are using Next.js' --turbo.
// Instead you will have to manually add the dependent paths to be included.
// For example
// ../libs/buttons/**/*.{ts,tsx,js,jsx,html}',                 <--- Adding a shared lib
// !../libs/buttons/**/*.{stories,spec}.{ts,tsx,js,jsx,html}', <--- Skip adding spec/stories files from shared lib

// If you are **not** using `--turbo` you can uncomment both lines 1 & 19.
// A discussion of the issue can be found: https://github.com/nrwl/nx/issues/26510

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './{src,pages,components,app}/**/*.{ts,tsx,js,jsx,html}',
    '!./{src,pages,components,app}/**/*.{stories,spec}.{ts,tsx,js,jsx,html}',
    //     ...createGlobPatternsForDependencies(__dirname)
  ],
  theme: {
    extend: {
      colors: {
        /** Auth / marketing palette (Material-style tokens from design HTML) */
        surface: '#0b1229',
        'surface-dim': '#0b1229',
        'surface-container-lowest': '#060d24',
        'surface-container-low': '#141a32',
        'surface-container': '#181e36',
        'surface-container-high': '#222941',
        'surface-container-highest': '#2d344c',
        'surface-variant': '#2d344c',
        'surface-bright': '#323851',
        'on-surface': '#dce1ff',
        'on-surface-variant': '#bbc9cf',
        'primary-container': '#00d4ff',
        'on-primary': '#003642',
        'outline-variant': '#3c494e',
        outline: '#859398',
        'secondary-container': '#cf5cff',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: 'var(--destructive)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'plus-jakarta': ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        'auth-header': '0px 0px 40px 0px rgba(0, 212, 255, 0.08)',
        'auth-glow-hover': '0px 0px 40px 0px rgba(0, 212, 255, 0.2)',
        'auth-video': '0px 0px 60px 0px rgba(0, 212, 255, 0.1)',
        'auth-pwa': '0px 20px 40px 0px rgba(0, 0, 0, 0.4)',
        'auth-nav': '0px -4px 20px 0px rgba(0, 212, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
