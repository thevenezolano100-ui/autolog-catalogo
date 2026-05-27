const express = require('express');
const router = express.Router();
const pool = require('../db');
const { upload, manejarErrorMulter } = require('../middleware/upload');

/**
 * GET /api/productos
 * Obtiene todos los productos con su marca, categoría y vehículos compatibles
 */
router.get('/', async (req, res, next) => {
    try {
        const query = `
            SELECT p.*, 
                   m.nombre AS marca, 
                   c.nombre AS categoria, 
                   COALESCE((SELECT json_agg(vehiculo_id) FROM aplicaciones WHERE producto_id = p.id), '[]') as vehiculos_compatibles
            FROM productos p 
            LEFT JOIN marcas m ON p.marca_id = m.id 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            ORDER BY p.id DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/productos
 * Crea un nuevo producto con imagen opcional
 */
router.post('/', upload.single('imagen'), manejarErrorMulter, async (req, res, next) => {
    try {
        const { codigo_pieza, marca_id, categoria_id, descripcion, vehiculos_compatibles, precio, stock } = req.body;
        const vehiculos = JSON.parse(vehiculos_compatibles || '[]');
        const imagen_url = req.file ? req.file.path : null;
        
        // Validaciones básicas
        if (!codigo_pieza || !descripcion) {
            return res.status(400).json({
                success: false,
                mensaje: 'Código de pieza y descripción son requeridos'
            });
        }
        
        const result = await pool.query(
            `INSERT INTO productos (codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio, stock) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, parseFloat(precio) || 0, parseInt(stock) || 0]
        );
        
        const nuevoId = result.rows[0].id;
        
        // Guardar relaciones con vehículos
        for (let vId of vehiculos) {
            await pool.query('INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES ($1, $2)', [nuevoId, vId]);
        }
        
        res.json({ 
            success: true, 
            mensaje: 'Repuesto guardado correctamente',
            data: { id: nuevoId }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/productos/:id
 * Actualiza un producto existente
 */
router.put('/:id', upload.single('imagen'), manejarErrorMulter, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { codigo_pieza, marca_id, categoria_id, descripcion, imagen_url_actual, vehiculos_compatibles, precio, stock } = req.body;
        const vehiculos = JSON.parse(vehiculos_compatibles || '[]');
        let imagen_url = req.file ? req.file.path : imagen_url_actual;
        
        // Validaciones básicas
        if (!codigo_pieza || !descripcion) {
            return res.status(400).json({
                success: false,
                mensaje: 'Código de pieza y descripción son requeridos'
            });
        }
        
        await pool.query(
            `UPDATE productos 
             SET codigo_pieza=$1, marca_id=$2, categoria_id=$3, descripcion=$4, imagen_url=$5, precio=$6, stock=$7 
             WHERE id=$8`,
            [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, parseFloat(precio) || 0, parseInt(stock) || 0, id]
        );
        
        // Actualizar relaciones con vehículos
        await pool.query('DELETE FROM aplicaciones WHERE producto_id = $1', [id]);
        for (let vId of vehiculos) {
            await pool.query('INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES ($1, $2)', [id, vId]);
        }
        
        res.json({ 
            success: true, 
            mensaje: 'Producto actualizado correctamente' 
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/productos/:id
 * Elimina un producto y sus aplicaciones asociadas
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM aplicaciones WHERE producto_id = $1', [id]);
        await pool.query('DELETE FROM productos WHERE id = $1', [id]);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
