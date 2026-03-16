/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#4f46e5', // Indigo 600
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                secondary: {
                    DEFAULT: '#64748b', // Slate 500
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                accent: {
                    DEFAULT: '#f97316', // Orange 500
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                dark: '#0f172a', // Slate 900
                light: '#f8fafc', // Slate 50
                success: '#10b981', // Emerald 500
                warning: '#f59e0b', // Amber 500
                danger: '#ef4444', // Red 500
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                heading: ['"Space Grotesk"', 'sans-serif'],
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.05)',
                'glass-hover': '0 12px 40px rgba(79, 70, 229, 0.1)',
                'glow': '0 0 20px rgba(79, 70, 229, 0.4)',
                'glow-sm': '0 0 10px rgba(79, 70, 229, 0.2)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                }
            }
        },
    },
    plugins: [],
    // Explicitly ensure print variant is available (Tailwind v3+ includes it by default)
    // No additional config needed - print: works out of the box
}
