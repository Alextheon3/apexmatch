/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      // ApexMatch Brand Colors
      colors: {
        // Primary Brand Colors
        'apex-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea', // Main brand color
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        'apex-pink': {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Main accent color
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
        
        // Trust Tier Colors
        'trust-challenged': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Red for challenged users
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        'trust-building': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Orange for building trust
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        'trust-reliable': {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308', // Yellow for reliable users
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        'trust-trusted': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Green for trusted users
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        'trust-elite': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#8b5cf6', // Purple for elite users
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        
        // BGP Category Colors
        'bgp-communication': '#3b82f6', // Blue
        'bgp-emotional': '#ec4899',     // Pink
        'bgp-lifestyle': '#10b981',     // Green
        'bgp-values': '#f59e0b',        // Amber
        'bgp-interests': '#8b5cf6',     // Purple
        
        // Functional Colors
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6',
        
        // Neutral Colors (for dark mode compatibility)
        'neutral-50': '#fafafa',
        'neutral-100': '#f5f5f5',
        'neutral-200': '#e5e5e5',
        'neutral-300': '#d4d4d4',
        'neutral-400': '#a3a3a3',
        'neutral-500': '#737373',
        'neutral-600': '#525252',
        'neutral-700': '#404040',
        'neutral-800': '#262626',
        'neutral-900': '#171717',
        'neutral-950': '#0a0a0a',
      },
      
      // Custom Font Families
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      
      // Custom Font Sizes
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      
      // Custom Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      
      // Custom Border Radius
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      
      // Custom Box Shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
        // ApexMatch specific shadows
        'apex': '0 10px 40px rgba(147, 51, 234, 0.15)',
        'trust': '0 8px 32px rgba(34, 197, 94, 0.15)',
        'reveal': '0 20px 60px rgba(236, 72, 153, 0.2)',
        'glow': '0 0 20px rgba(147, 51, 234, 0.3)',
      },
      
      // Custom Gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'apex-gradient': 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
        'trust-gradient': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'reveal-gradient': 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      
      // Custom Animations
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'reveal-flip': 'revealFlip 0.8s ease-in-out',
        'trust-pulse': 'trustPulse 2s ease-in-out infinite',
      },
      
      // Custom Keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 5px rgba(147, 51, 234, 0.5))' },
          '100%': { filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.8))' },
        },
        revealFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        trustPulse: {
          '0%, 100%': { 
            transform: 'scale(1)',
            filter: 'drop-shadow(0 0 5px rgba(34, 197, 94, 0.3))'
          },
          '50%': { 
            transform: 'scale(1.02)',
            filter: 'drop-shadow(0 0 15px rgba(34, 197, 94, 0.6))'
          },
        },
      },
      
      // Custom Z-Index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Custom Max Width
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      
      // Custom Backdrop Blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
    },
  },
  plugins: [
    // Custom plugin for ApexMatch utilities
    function({ addUtilities, addComponents, theme }) {
      // Glass morphism utilities
      addUtilities({
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
      });
      
      // Gradient text utilities
      addUtilities({
        '.text-gradient-apex': {
          'background': 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-trust': {
          'background': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      });
      
      // Custom components
      addComponents({
        '.btn-apex': {
          '@apply px-6 py-3 bg-gradient-to-r from-apex-purple-600 to-apex-pink-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105': {},
        },
        '.card-glass': {
          '@apply bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl': {},
        },
        '.trust-ring': {
          '@apply w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-sm': {},
        },
        '.reveal-card': {
          '@apply relative overflow-hidden rounded-2xl shadow-2xl transform transition-all duration-500': {},
        },
        '.bgp-trait-bar': {
          '@apply h-3 rounded-full bg-gray-200 overflow-hidden': {},
        },
        '.match-card': {
          '@apply bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:scale-105': {},
        },
      });
    },
  ],
  
  // Safelist for dynamic classes
  safelist: [
    // Trust tier colors
    'text-trust-challenged-500',
    'text-trust-building-500', 
    'text-trust-reliable-500',
    'text-trust-trusted-500',
    'text-trust-elite-500',
    'bg-trust-challenged-500',
    'bg-trust-building-500',
    'bg-trust-reliable-500', 
    'bg-trust-trusted-500',
    'bg-trust-elite-500',
    'border-trust-challenged-500',
    'border-trust-building-500',
    'border-trust-reliable-500',
    'border-trust-trusted-500',
    'border-trust-elite-500',
    
    // BGP category colors
    'text-bgp-communication',
    'text-bgp-emotional',
    'text-bgp-lifestyle',
    'text-bgp-values',
    'text-bgp-interests',
    'bg-bgp-communication',
    'bg-bgp-emotional',
    'bg-bgp-lifestyle',
    'bg-bgp-values',
    'bg-bgp-interests',
    
    // Dynamic widths for progress bars
    'w-0', 'w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12',
    'w-6/12', 'w-7/12', 'w-8/12', 'w-9/12', 'w-10/12', 'w-11/12', 'w-full',
    
    // Animation classes
    'animate-pulse',
    'animate-bounce',
    'animate-spin',
    'animate-ping',
    'animate-heartbeat',
    'animate-glow',
    'animate-reveal-flip',
    'animate-trust-pulse',
  ],
}