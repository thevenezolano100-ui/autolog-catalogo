const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authService = require('../middleware/authService');
const validarResultados = require('../middleware/validacion');

// Validaciones para login
const validarLogin = [
    body('usuario')
        .trim()
        .notEmpty().withMessage('El nombre de usuario es requerido')
        .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres'),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 4 }).withMessage('La contraseña debe tener al menos 4 caracteres'),
    validarResultados
];

/**
 * POST /api/auth/login
 * Autentica un usuario y devuelve un token JWT
 */
router.post('/login', validarLogin, async (req, res, next) => {
    try {
        const { usuario, password } = req.body;
        
        const resultado = await authService.login(usuario, password);
        
        if (!resultado.success) {
            return res.status(401).json(resultado);
        }
        
        res.json(resultado);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/migrar-passwords
 * Endpoint temporal para migrar contraseñas a hash
 * Solo debe usarse una vez y luego eliminarse
 */
router.post('/migrar-passwords', async (req, res, next) => {
    try {
        // En producción, esto debería estar protegido con un token especial
        await authService.migrarPasswords();
        res.json({ 
            success: true, 
            mensaje: 'Migración de contraseñas completada' 
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
