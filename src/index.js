const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ===============================================
// 1. TUS CREDENCIALES (Cámbialas cuando puedas)
// ===============================================
const ENLACE_NEON = 'AQUI_PONES_TU_ENLACE_DE_NEON_TECH';
const CLOUD_NAME = 'TU_CLOUD_NAME';
const API_KEY = 'TU_API_KEY';
const API_SECRET = 'TU_API_SECRET';

// ===============================================
// 2. ESCUDO ANTI-CAÍDAS DE BASE DE DATOS
// ===============================================
let pool;
try {
    pool = new Pool({ connectionString: ENLACE_NEON });
    
    // Si conecta, forzamos la creación de todas las tablas por si Neon está vacío
    pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nombre_usuario VARCHAR(50), contrasena VARCHAR(50));
        CREATE TABLE IF NOT EXISTS marcas (id SERIAL PRIMARY KEY, nombre VARCHAR(100));
        CREATE TABLE IF NOT EXISTS categorias (id SERIAL PRIMARY KEY, nombre VARCHAR(100));
        CREATE TABLE IF NOT EXISTS productos (id SERIAL PRIMARY KEY, codigo_pieza VARCHAR(100), descripcion TEXT, precio DECIMAL(10,2), stock INT DEFAULT 0, marca_id INT, categoria_id INT, imagen_url TEXT);
        CREATE TABLE IF NOT EXISTS aplicaciones (producto_id INT, vehiculo_id INT, PRIMARY KEY (producto_id, vehiculo_id));
        CREATE TABLE IF NOT EXISTS vehiculos (id SERIAL PRIMARY KEY, marca_auto VARCHAR(100), modelo VARCHAR(100), anio_inicio INT, anio_fin INT, motor VARCHAR(100));
        CREATE TABLE IF NOT EXISTS ventas (id SERIAL PRIMARY KEY, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP, metodo_pago VARCHAR(50), total DECIMAL(10, 2), comprobante_url TEXT);
        CREATE TABLE IF NOT EXISTS detalles_venta (id SERIAL PRIMARY KEY, venta_id INT, producto_id INT, cantidad INT, precio_unitario DECIMAL(10, 2), subtotal DECIMAL(10, 2));
    `).catch(err => console.log("Aviso interno de tablas BD:", err.message));

} catch (error) {
    console.error("⚠️ ADVERTENCIA: Enlace de Neon inválido. El servidor operará en modo restringido.");
    pool = { query: async () => { throw new Error("Base de datos no configurada en index.js") } };
}

// ===============================================
// 3. ESCUDO ANTI-CAÍDAS DE CLOUDINARY
// ===============================================
let upload;
if (CLOUD_NAME === 'TU_CLOUD_NAME' || !CLOUD_NAME) {
    console.warn("⚠️ ADVERTENCIA: Cloudinary no configurado. Las fotos no se guardarán.");
    upload = multer({ storage: multer.memoryStorage() }); // Modo seguro
} else {
    cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
    const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'autolog_repuestos' } });
    upload = multer({ storage: storage });
}

// ===============================================
// RUTAS DEL SISTEMA (LOGIN, MARCAS Y CATEGORIAS)
// ===============================================
app.post('/api/login', async (req, res) => { const { usuario, password } = req.body; try { const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [usuario, password]); if (result.rows.length > 0) res.json({ success: true, mensaje: 'Acceso concedido' }); else res.status(401).json({ success: false, mensaje: 'Credenciales incorrectas' }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/usuario-admin', async (req, res) => { try { const r = await pool.query('SELECT id, nombre_usuario FROM usuarios ORDER BY id ASC LIMIT 1'); res.json(r.rows[0]); } catch (err) { res.status(500).send(err); } });
app.put('/api/usuario/:id', async (req, res) => { const { id } = req.params; const { nuevo_nombre, nueva_contrasena } = req.body; try { await pool.query('UPDATE usuarios SET nombre_usuario = $1, contrasena = $2 WHERE id = $3', [nuevo_nombre, nueva_contrasena, id]); res.json({ success: true }); } catch (err) { res.status(500).send(err); } });

app.get('/api/marcas', async (req, res) => { try { const r = await pool.query('SELECT * FROM marcas ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/marcas', async (req, res) => { try { await pool.query('INSERT INTO marcas (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/marcas/:id', async (req, res) => { try { await pool.query('UPDATE marcas SET nombre = $1 WHERE id = $2', [req.body.nombre, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/marcas/:id', async (req, res) => { try { await pool.query('DELETE FROM marcas WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get('/api/categorias', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorias ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/categorias', async (req, res) => { try { await pool.query('INSERT INTO categorias (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/categorias/:id', async (req, res) => { try { await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get('/api/vehiculos', async (req, res) => { try { const r = await pool.query('SELECT * FROM vehiculos ORDER BY marca_auto, modelo'); res.json(r.rows); } catch (err) { res.status(500).send(err); } });

// ===============================================
// INVENTARIO
// ===============================================
app.get('/api/productos', async (req, res) => { try { const query = `SELECT p.*, m.nombre AS marca, c.nombre AS categoria FROM productos p LEFT JOIN marcas m ON p.marca_id = m.id LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.id DESC`; const r = await pool.query(query); res.json(r.rows); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/productos', upload.single('imagen'), async (req, res) => { const { codigo_pieza, marca_id, categoria_id, descripcion, precio, stock } = req.body; const imagen_url = req.file && req.file.path ? req.file.path : null; try { await pool.query('INSERT INTO productos (codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)', [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, stock || 0]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => { const { id } = req.params; const { codigo_pieza, marca_id, categoria_id, descripcion, imagen_url_actual, precio, stock } = req.body; let imagen_url = req.file && req.file.path ? req.file.path : imagen_url_actual; try { await pool.query('UPDATE productos SET codigo_pieza=$1, marca_id=$2, categoria_id=$3, descripcion=$4, imagen_url=$5, precio=$6, stock=$7 WHERE id=$8', [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, stock || 0, id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/productos/:id', async (req, res) => { try { await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); } });

// ===============================================
// CAJA REGISTRADORA (POS)
// ===============================================
app.post('/api/ventas', upload.single('comprobante'), async (req, res) => {
    const { metodo_pago, total, detalles } = req.body;
    let productosVendidos = [];
    try { productosVendidos = JSON.parse(detalles || '[]'); } catch(e) { return res.status(400).json({ error: "Detalles de venta corruptos" }); }
    const comprobante_url = req.file && req.file.path ? req.file.path : null;
    
    try {
        await pool.query('BEGIN');
        const resVenta = await pool.query('INSERT INTO ventas (metodo_pago, total, comprobante_url) VALUES ($1, $2, $3) RETURNING id', [metodo_pago, total, comprobante_url]);
        const ventaId = resVenta.rows[0].id;
        
        for (let item of productosVendidos) {
            const subtotal = item.cantidad * item.precio;
            await pool.query('INSERT INTO detalles_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)', [ventaId, item.id, item.cantidad, item.precio, subtotal]);
            await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
        }
        await pool.query('COMMIT');
        res.json({ success: true, venta_id: ventaId });
    } catch (error) { 
        await pool.query('ROLLBACK'); 
        res.status(500).json({ error: error.message }); 
    }
});

app.listen(PORT, () => { console.log(`✅ Backend blindado corriendo en puerto ${PORT}`); });