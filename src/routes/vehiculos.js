const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/vehiculos
 * Obtiene todos los vehículos ordenados por marca y modelo
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM vehiculos ORDER BY marca_auto, modelo');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/vehiculos
 * Crea un nuevo vehículo
 */
router.post('/', async (req, res, next) => {
    try {
        const { marca_auto, modelo, anio_inicio, anio_fin, motor } = req.body;
        
        if (!marca_auto || !modelo) {
            return res.status(400).json({
                success: false,
                mensaje: 'Marca y modelo son requeridos'
            });
        }
        
        await pool.query(
            'INSERT INTO vehiculos (marca_auto, modelo, anio_inicio, anio_fin, motor) VALUES ($1, $2, $3, $4, $5)',
            [marca_auto, modelo, anio_inicio || null, anio_fin || null, motor || null]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/vehiculos/:id
 * Actualiza un vehículo existente
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { marca_auto, modelo, anio_inicio, anio_fin, motor } = req.body;
        
        if (!marca_auto || !modelo) {
            return res.status(400).json({
                success: false,
                mensaje: 'Marca y modelo son requeridos'
            });
        }
        
        await pool.query(
            'UPDATE vehiculos SET marca_auto=$1, modelo=$2, anio_inicio=$3, anio_fin=$4, motor=$5 WHERE id=$6',
            [marca_auto, modelo, anio_inicio || null, anio_fin || null, motor || null, id]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/vehiculos/:id
 * Elimina un vehículo y sus aplicaciones asociadas
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Eliminar aplicaciones asociadas primero
        await pool.query('DELETE FROM aplicaciones WHERE vehiculo_id = $1', [id]);
        await pool.query('DELETE FROM vehiculos WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/vehiculos/marcas
 * Obtiene todas las marcas de vehículos distintas
 */
router.get('/marcas', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT DISTINCT marca_auto FROM vehiculos ORDER BY marca_auto');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/vehiculos/modelos/:marca
 * Obtiene todos los modelos de una marca específica
 */
router.get('/modelos/:marca', async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT modelo FROM vehiculos WHERE marca_auto = $1 ORDER BY modelo',
            [req.params.marca]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
