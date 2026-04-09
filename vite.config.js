import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
var isElectronBuild = process.env.ELECTRON === 'true';
export default defineConfig({
    base: isElectronBuild ? './' : '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        open: true,
        proxy: {
            '/api': {
                target: process.env.VITE_DEV_API_TARGET || 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'es2020',
        minify: 'terser',
        // Performance: divide dependencias grandes en chunks cacheables para reducir costo inicial.
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (!id.includes('node_modules'))
                        return;
                    if (id.includes('recharts'))
                        return 'vendor-charts';
                    if (id.includes('jspdf'))
                        return 'vendor-jspdf';
                    if (id.includes('html2canvas'))
                        return 'vendor-html2canvas';
                    if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler'))
                        return 'vendor-react-core';
                    if (id.includes('react-router-dom'))
                        return 'vendor-router';
                    if (id.includes('@radix-ui'))
                        return 'vendor-radix';
                    if (id.includes('lucide-react'))
                        return 'vendor-icons';
                    if (id.includes('react-hook-form') || id.includes('zod'))
                        return 'vendor-forms';
                    if (id.includes('date-fns'))
                        return 'vendor-date';
                    if (id.includes('sonner'))
                        return 'vendor-toast';
                    return 'vendor';
                },
            },
        },
    },
});
