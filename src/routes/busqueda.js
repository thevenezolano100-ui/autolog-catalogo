const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * GET /api/buscar/por-vehiculo
 * Busca productos compatibles con un vehículo específico
 */
router.get('/buscar/por-vehiculo', async (req, res, next) => {
    const { marca, modelo } = req.query;
    
    if (!marca || !modelo) {
        return res.status(400).json({
            success: false,
            mensaje: 'Marca y modelo son requeridos'
        });
    }
    
    try {
        const query = `
            SELECT DISTINCT p.id, p.codigo_pieza, p.descripcion, p.imagen_url, 
                   p.precio, p.stock, m.nombre as marca, c.nombre as categoria 
            FROM productos p 
            JOIN marcas m ON p.marca_id = m.id 
            JOIN categorias c ON p.categoria_id = c.id 
            JOIN aplicaciones a ON p.id = a.producto_id 
            JOIN vehiculos v ON a.vehiculo_id = v.id 
            WHERE v.marca_auto = $1 AND v.modelo = $2
        `;
        const result = await pool.query(query, [marca, modelo]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
