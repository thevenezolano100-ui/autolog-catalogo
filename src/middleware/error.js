/**
 * Middleware para manejo global de errores
 * Centraliza el tratamiento de errores en toda la aplicación
 */

const manejarErrores = (err, req, res, next) => {
    // Log del error para debugging (en producción usar un servicio de logging)
    console.error('❌ Error:', {
        mensaje: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        ruta: req.path,
        metodo: req.method
    });

    // Errores de PostgreSQL
    if (err.code) {
        switch (err.code) {
            case '23505': // Violación de clave única
                return res.status(409).json({
                    success: false,
                    mensaje: 'El registro ya existe o viola una restricción única'
                });
            case '23503': // Violación de clave foránea
                return res.status(400).json({
                    success: false,
                    mensaje: 'El registro está relacionado con otros datos y no puede ser eliminado'
                });
            case '23506': // Violación de restricción de check
                return res.status(400).json({
                    success: false,
                    mensaje: 'Los datos proporcionados violan una restricción de la base de datos'
                });
            default:
                return res.status(500).json({
                    success: false,
                    mensaje: 'Error en la base de datos'
                });
        }
    }

    // Errores de JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            mensaje: 'JSON inválido en el request'
        });
    }

    // Error por defecto
    const statusCode = err.statusCode || 500;
    const mensaje = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        success: false,
        mensaje,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = manejarErrores;
