/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nexus-teal': '#00E5FF',     /* Neon Teal para resaltar */
        'nexus-dark': '#0B0F19',     /* Fondo ultra oscuro principal */
        'nexus-card': '#151A2D',     /* Fondo de tarjetas */
        'nexus-gray': '#8B949E',     /* Texto secundario */
        'nexus-text': '#E2E8F0',     /* Texto principal claro */
        'nexus-neon-purple': '#B388FF'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(145deg, rgba(21, 26, 45, 0.7), rgba(11, 15, 25, 0.9))',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 229, 255, 0.3)',
        'neon-hover': '0 0 25px rgba(0, 229, 255, 0.6)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
