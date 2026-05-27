const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/marcas
 * Obtiene todas las marcas ordenadas alfabéticamente
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM marcas ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/marcas
 * Crea una nueva marca
 */
router.post('/', async (req, res, next) => {
    try {
        const { nombre } = req.body;
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                mensaje: 'El nombre de la marca es requerido'
            });
        }
        
        await pool.query('INSERT INTO marcas (nombre) VALUES ($1)', [nombre.trim()]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/marcas/:id
 * Actualiza una marca existente
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                mensaje: 'El nombre de la marca es requerido'
            });
        }
        
        await pool.query('UPDATE marcas SET nombre = $1 WHERE id = $2', [nombre.trim(), id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/marcas/:id
 * Elimina una marca (solo si no tiene productos asociados)
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verificar si tiene productos asociados
        const check = await pool.query('SELECT * FROM productos WHERE marca_id = $1', [id]);
        
        if (check.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No se puede eliminar: la marca tiene repuestos asociados' 
            });
        }
        
        await pool.query('DELETE FROM marcas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
