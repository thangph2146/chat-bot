tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fcebe9',
                    100: '#f9d7d3',
                    200: '#f3afa7',
                    300: '#ed877b',
                    400: '#e75f4f',
                    500: '#e13723',
                    600: '#b42c1c',
                    700: '#872115',
                    800: '#59160e',
                    900: '#2c0b07',
                },
                secondary: {
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
                },
                accent: {
                    50: '#ebf6ff',
                    100: '#d6edff',
                    200: '#addbff',
                    300: '#85c9ff',
                    400: '#5cb7ff',
                    500: '#3388ff',
                    600: '#296cd9',
                    700: '#1f51b3',
                    800: '#15378c',
                    900: '#0a1c66',
                },
                hub: {
                    red: '#e13723',
                    darkRed: '#b42c1c',
                    gold: '#eaaa00',
                    navy: '#0a1c66',
                    gray: '#64748b',
                    lightGray: '#e2e8f0',
                    white: '#ffffff'
                }
            },
            boxShadow: {
                message: '0 4px 8px rgba(225, 55, 35, 0.1)',
                container: '0 6px 16px rgba(0, 0, 0, 0.12)',
                input: '0 -4px 12px rgba(0, 0, 0, 0.08)',
                hover: '0 8px 20px rgba(0, 0, 0, 0.15)',
                glow: '0 0 15px rgba(225, 55, 35, 0.4)',
                goldGlow: '0 0 15px rgba(234, 170, 0, 0.4)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'bounce': 'bounce 1.4s infinite ease-in-out both',
                'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                bounce: {
                    '0%, 80%, 100%': { transform: 'scale(0)' },
                    '40%': { transform: 'scale(1.0)' },
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
        }
    }
}