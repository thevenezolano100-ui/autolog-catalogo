const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');
const authService = require('../middleware/authService');
const { body } = require('express-validator');
const validarResultados = require('../middleware/validacion');

// Validaciones para usuario
const validarUsuario = [
    body('nuevo_nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage('El nombre debe tener entre 3 y 50 caracteres'),
    body('nueva_contrasena')
        .optional()
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validarResultados
];

/**
 * GET /api/usuario/perfil
 * Obtiene el perfil del usuario autenticado
 */
router.get('/perfil', verificarToken, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre_usuario, rol, created_at FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Usuario no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/usuario/actualizar
 * Actualiza el perfil del usuario autenticado
 */
router.put('/actualizar', verificarToken, validarUsuario, async (req, res, next) => {
    try {
        const { nuevo_nombre, nueva_contrasena } = req.body;
        const userId = req.usuario.id;
        
        // Construir query dinámico solo con los campos proporcionados
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (nuevo_nombre) {
            updates.push(`nombre_usuario = $${paramIndex++}`);
            values.push(nuevo_nombre);
        }
        
        if (nueva_contrasena) {
            // Hashear la nueva contraseña
            const hash = await authService.generarHashPassword(nueva_contrasena);
            updates.push(`contrasena = $${paramIndex++}`);
            values.push(hash);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                mensaje: 'No se proporcionaron campos para actualizar'
            });
        }
        
        values.push(userId);
        const query = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, nombre_usuario, rol`;
        
        const result = await pool.query(query, values);
        
        res.json({
            success: true,
            mensaje: 'Perfil actualizado correctamente',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/usuario/admin
 * Obtiene información del primer usuario admin (para compatibilidad)
 * En producción debería eliminarse o protegerse mejor
 */
router.get('/admin', async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre_usuario, rol FROM usuarios ORDER BY id ASC LIMIT 1'
        );
        
        res.json(result.rows[0] || null);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
