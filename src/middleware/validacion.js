const { validationResult } = require('express-validator');

/**
 * Middleware para validar resultados de express-validator
 * Se debe usar después de los middlewares de validación
 */
const validarResultados = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            mensaje: 'Errores de validación',
            errores: errors.array().map(err => ({
                campo: err.path,
                mensaje: err.msg
            }))
        });
    }
    
    next();
};

module.exports = validarResultados;
