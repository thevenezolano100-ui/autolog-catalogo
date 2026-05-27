const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');
const manejarErrores = require('./middleware/error');

// Importar rutas
const authRoutes = require('./routes/auth');
const usuarioRoutes = require('./routes/usuario');
const marcasRoutes = require('./routes/marcas');
const categoriasRoutes = require('./routes/categorias');
const vehiculosRoutes = require('./routes/vehiculos');
const productosRoutes = require('./routes/productos');
const busquedaRoutes = require('./routes/busqueda');

const app = express();

// ===============================================
// CONFIGURACIÓN DE MIDDLEWARES GLOBALES
// ===============================================

// CORS configurado de forma segura para producción
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://tudominio.com'] // Cambiar por el dominio real en producción
        : true, // Permitir todos los orígenes en desarrollo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parseo de JSON
app.use(express.json());

// Parseo de URL-encoded
app.use(express.urlencoded({ extended: true }));

// ===============================================
// RUTAS DE LA API
// ===============================================

// Rutas de autenticación y usuario
app.use('/api/auth', authRoutes);
app.use('/api/usuario', usuarioRoutes);

// Rutas de catálogo
app.use('/api/marcas', marcasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/productos', productosRoutes);

// Rutas de búsqueda
app.use('/api', busquedaRoutes);

// ===============================================
// RUTA DE HEALTH CHECK
// ===============================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        mensaje: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV
    });
});

// ===============================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ===============================================
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        mensaje: `Ruta ${req.method} ${req.path} no encontrada`
    });
});

// ===============================================
// MANEJO GLOBAL DE ERRORES
// ===============================================
app.use(manejarErrores);

// ===============================================
// INICIAR SERVIDOR
// ===============================================
const PORT = config.PORT;

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           🚗 AUTOLOG - SISTEMA DE REPUESTOS           ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ ✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`║ 🌍 Entorno: ${config.NODE_ENV}`);
    console.log(`║ 📡 API disponible en http://localhost:${PORT}/api`);
    console.log('╚════════════════════════════════════════════════════════╝');
});

module.exports = app;