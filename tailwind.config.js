// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // Aquí definimos los colores personalizados
        colors: {
          'brand-primary': '#0d4a68',     // Azul oscuro del header
          'brand-secondary': '#e8f4f8',   // Azul claro de las filas
          'rank-1': '#ffc107',            // Amarillo para 1er lugar
          'rank-2': '#ff9800',            // Naranja para 2do lugar
          'rank-3': '#cd7f32',            // Bronce para 3er lugar (más legible que el rojo de la imagen)
        },
        fontFamily: {
          'sans': ['Montserrat', 'sans-serif'], // Opcional: para usar la misma fuente
        },
        // Para crear el espacio entre filas de la tabla
        borderSpacing: {
          'y-2.5': '0.625rem',
        }
      },
    },
    plugins: [],
  }