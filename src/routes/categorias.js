const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/categorias
 * Obtiene todas las categorías ordenadas alfabéticamente
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/categorias
 * Crea una nueva categoría
 */
router.post('/', async (req, res, next) => {
    try {
        const { nombre } = req.body;
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                mensaje: 'El nombre de la categoría es requerido'
            });
        }
        
        await pool.query('INSERT INTO categorias (nombre) VALUES ($1)', [nombre.trim()]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/categorias/:id
 * Actualiza una categoría existente
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                mensaje: 'El nombre de la categoría es requerido'
            });
        }
        
        await pool.query('UPDATE categorias SET nombre = $1 WHERE id = $2', [nombre.trim(), id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/categorias/:id
 * Elimina una categoría (solo si no tiene productos asociados)
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar si tiene productos asociados
        const check = await pool.query('SELECT * FROM productos WHERE categoria_id = $1', [id]);
        
        if (check.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No se puede eliminar: la categoría tiene repuestos asociados' 
            });
        }
        
        await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
