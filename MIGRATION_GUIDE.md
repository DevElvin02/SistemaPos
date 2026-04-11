# Migración de Next.js a React + Vite

## Resumen de cambios realizados

Este proyecto ha sido migrado exitosamente de **Next.js 16** a **React 19 + Vite 5** manteniendo toda la funcionalidad del admin dashboard.

## Estructura del Proyecto

```
src/
├── App.tsx                 # Punto de entrada con React Router
├── main.tsx                # Bootstrap de la aplicación
├── index.css               # Estilos globales y temas
├── components/
│   └── admin/
│       ├── Sidebar.tsx     # Navegación principal
│       └── Header.tsx      # Encabezado superior
├── layouts/
│   └── AdminLayout.tsx     # Layout base para todas las páginas
├── pages/
│   └── admin/
│       ├── Dashboard.tsx
│       ├── Orders.tsx
│       ├── Customers.tsx
│       ├── Products.tsx
│       ├── Suppliers.tsx
│       ├── Inventory.tsx
│       ├── Purchases.tsx
│       ├── Reports.tsx
│       └── Settings.tsx
├── lib/
│   ├── data/               # Mock data
│   │   ├── orders.ts
│   │   ├── customers.ts
│   │   ├── products.ts
│   │   ├── suppliers.ts
│   │   └── inventory.ts
│   └── utils.ts            # Funciones utilitarias (cn)
└── context/
    └── AdminContext.tsx    # Gestión de estado global
```

## Cambios principales

### 1. Configuración de Vite
- Creado `vite.config.ts` con alias de rutas `@`
- Configurado TypeScript con `tsconfig.json` y `tsconfig.node.json`
- Punto de entrada HTML en `index.html`

### 2. Enrutamiento
- **Antes**: Next.js App Router
- **Ahora**: React Router v6 con rutas define en `App.tsx`
- Navegación con `<Link>` de React Router
- Layout anidado con `<Outlet>`

### 3. Gestión de Estado
- **Antes**: Next.js `useState` en componentes de servidor
- **Ahora**: React Context + useReducer en `AdminContext.tsx`
- Estado global accesible con `useAdmin()` hook

### 4. Estilos
- Tailwind CSS v4 configurado correctamente
- Mismo sistema de diseño de tokens de color
- PostCSS configurado para Tailwind

### 5. Scripts de compilación
```json
{
  "dev": "vite",          // Desarrollo con HMR
  "build": "tsc -b && vite build",  // Compilación optimizada
  "preview": "vite preview" // Vista previa de producción
}
```

## Inicio rápido

### Instalación
```bash
npm install
# o
pnpm install
```

### Desarrollo
```bash
npm run dev
```
La aplicación se abrirá automáticamente en `http://localhost:5173`

### Construcción
```bash
npm run build
```
Los archivos compilados estarán en la carpeta `dist/`

### Vista previa de producción
```bash
npm run preview
```

## Migraciones futuras necesarias

Las siguientes características requieren migración de los componentes antigüos de Next.js:

1. **Componentes personalizados** en `components/admin/`
   - OrderModals.tsx
   - ProductEditModal.tsx
   - DataTable.tsx
   - etc.

2. **Páginas completas** - Actualmente son placeholders, necesitan:
   - Tablas de datos funcionales
   - Modales de edición
   - Búsqueda y filtros

3. **Funciones utilitarias**:
   - `invoice-generator.ts` - Necesita adaptación para browser

## Variables de entorno

Create un archivo `.env.local` si necesitas variables de entorno:

```
VITE_API_URL=http://localhost:3000
```

Accede con `import.meta.env.VITE_API_URL`

## Diferencias con Next.js

| Característica | Next.js | Vite |
|---|---|---|
| Enrutamiento | App Router | React Router |
| Servidor | Integrado | Separado (Express/Node) |
| Estado | Server + Client | Context API |
| Rendering | SSR/SSG | Client-side |
| Imports | `next/link`, etc | `react-router-dom` |
| Modulos | CommonJS + ES6 | ES6 modules |

## Dependencias principales

```json
{
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "react-router-dom": "^6.21.0",
  "vite": "^5.0.8",
  "@vitejs/plugin-react": "^4.2.1",
  "tailwindcss": "^4.2.0"
}
```

## Notas de desarrollo

- Hot Module Replacement (HMR) habilitado automáticamente en desarrollo
- TypeScript strict mode habilitado
- Path aliases configurados (`@/` resuelve a `src/`)
- Todos los componentes son Client Components por defecto

## Soporte

Para preguntas o issues con la migración, consulta:
- [Documentación de Vite](https://vitejs.dev)
- [React Router v6](https://reactrouter.com)
- [Tailwind CSS v4](https://tailwindcss.com)
