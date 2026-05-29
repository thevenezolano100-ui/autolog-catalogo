const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000; // Render asigna el puerto aquí

// BLINDAJE DE SEGURIDAD RED (CORS) - Permite que el frontend Vercel se comunique sin bloqueos
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

// ===============================================
// 1. TUS CREDENCIALES (PEGALAS AQUÍ)
// ===============================================
const ENLACE_NEON = 'postgresql://neondb_owner:npg_GSfl19XITPFj@ep-wispy-bonus-anshmeg3.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const CLOUD_NAME = 'ddrqga65e';
const API_KEY = '781739566125483';
const API_SECRET = '0Yja9-EHbn8ESfClJEuKitLi35k';

// ===============================================
// 2. DIAGNÓSTICO DEL SERVIDOR (HEALTH CHECK)
// ===============================================
app.get('/', (req, res) => {
    res.status(200).send('✅ Servidor Backend AUTOLOG funcionando correctamente en la nube Render.');
});

// ===============================================
// 3. CONEXIÓN A BASE DE DATOS (NEON)
// ===============================================
let pool;
try {
    if (!ENLACE_NEON.startsWith('postgres')) throw new Error("Falta enlace real");
    pool = new Pool({ connectionString: ENLACE_NEON });
    pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nombre_usuario VARCHAR(50), contrasena VARCHAR(50));
        CREATE TABLE IF NOT EXISTS marcas (id SERIAL PRIMARY KEY, nombre VARCHAR(100));
        CREATE TABLE IF NOT EXISTS categorias (id SERIAL PRIMARY KEY, nombre VARCHAR(100));
        CREATE TABLE IF NOT EXISTS productos (id SERIAL PRIMARY KEY, codigo_pieza VARCHAR(100), descripcion TEXT, precio DECIMAL(10,2), stock INT DEFAULT 0, marca_id INT, categoria_id INT, imagen_url TEXT);
        CREATE TABLE IF NOT EXISTS aplicaciones (producto_id INT, vehiculo_id INT, PRIMARY KEY (producto_id, vehiculo_id));
        CREATE TABLE IF NOT EXISTS vehiculos (id SERIAL PRIMARY KEY, marca_auto VARCHAR(100), modelo VARCHAR(100), anio_inicio INT, anio_fin INT, motor VARCHAR(100));
        CREATE TABLE IF NOT EXISTS ventas (id SERIAL PRIMARY KEY, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP, metodo_pago VARCHAR(50), total DECIMAL(10, 2), comprobante_url TEXT);
        CREATE TABLE IF NOT EXISTS detalles_venta (id SERIAL PRIMARY KEY, venta_id INT, producto_id INT, cantidad INT, precio_unitario DECIMAL(10, 2), subtotal DECIMAL(10, 2));
    `).catch(err => console.log("Aviso interno BD:", err.message));
} catch (error) {
    console.warn("⚠️ Servidor en Modo Restringido: Faltan credenciales de Neon en index.js");
    pool = { query: async () => { throw new Error("Base de datos no configurada.") } };
}

// ===============================================
// 4. CONEXIÓN A CLOUDINARY
// ===============================================
let upload;
if (CLOUD_NAME === 'TU_CLOUD_NAME' || !CLOUD_NAME) {
    upload = multer({ storage: multer.memoryStorage() }); 
} else {
    cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
    const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'autolog_repuestos' } });
    upload = multer({ storage: storage });
}

// ===============================================
// RUTAS DE SISTEMA
// ===============================================
app.post('/api/login', async (req, res) => { const { usuario, password } = req.body; try { const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [usuario, password]); if (result.rows.length > 0) res.json({ success: true, mensaje: 'Acceso concedido' }); else res.status(401).json({ success: false, mensaje: 'Credenciales incorrectas' }); } catch (err) { res.status(500).json({ error: err.message }); } });

// MARCAS Y CATEGORIAS
app.get('/api/marcas', async (req, res) => { try { const r = await pool.query('SELECT * FROM marcas ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/marcas', async (req, res) => { try { await pool.query('INSERT INTO marcas (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/marcas/:id', async (req, res) => { 
    try { 
        const check = await pool.query('SELECT id FROM productos WHERE marca_id = $1 LIMIT 1', [req.params.id]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Marca en uso.' });
        await pool.query('DELETE FROM marcas WHERE id = $1', [req.params.id]); res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: err.message }); } 
});

app.get('/api/categorias', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorias ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/categorias', async (req, res) => { try { await pool.query('INSERT INTO categorias (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/categorias/:id', async (req, res) => { 
    try { 
        const check = await pool.query('SELECT id FROM productos WHERE categoria_id = $1 LIMIT 1', [req.params.id]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Categoría en uso.' });
        await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]); res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: err.message }); } 
});

// INVENTARIO
app.get('/api/productos', async (req, res) => { try { const query = `SELECT p.*, m.nombre AS marca, c.nombre AS categoria FROM productos p LEFT JOIN marcas m ON p.marca_id = m.id LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.id DESC`; const r = await pool.query(query); res.json(r.rows); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/productos', upload.single('imagen'), async (req, res) => { const { codigo_pieza, marca_id, categoria_id, descripcion, precio, stock } = req.body; const imagen_url = req.file && req.file.path ? req.file.path : null; try { await pool.query('INSERT INTO productos (codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)', [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, stock || 0]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => { const { id } = req.params; const { codigo_pieza, marca_id, categoria_id, descripcion, imagen_url_actual, precio, stock } = req.body; let imagen_url = req.file && req.file.path ? req.file.path : imagen_url_actual; try { await pool.query('UPDATE productos SET codigo_pieza=$1, marca_id=$2, categoria_id=$3, descripcion=$4, imagen_url=$5, precio=$6, stock=$7 WHERE id=$8', [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, stock || 0, id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/productos/:id', async (req, res) => { try { await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); } });

// POS VENTAS
app.post('/api/ventas', upload.single('comprobante'), async (req, res) => {
    const { metodo_pago, total, detalles } = req.body;
    let productosVendidos = [];
    try { productosVendidos = JSON.parse(detalles || '[]'); } catch(e) { return res.status(400).json({ error: "Detalles corruptos" }); }
    const comprobante_url = req.file && req.file.path ? req.file.path : null;
    
    try {
        await pool.query('BEGIN');
        const resVenta = await pool.query('INSERT INTO ventas (metodo_pago, total, comprobante_url) VALUES ($1, $2, $3) RETURNING id', [metodo_pago, total, comprobante_url]);
        const ventaId = resVenta.rows[0].id;
        
        for (let item of productosVendidos) {
            await pool.query('INSERT INTO detalles_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)', [ventaId, item.id, item.cantidad, item.precio, item.cantidad * item.precio]);
            await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
        }
        await pool.query('COMMIT');
        res.json({ success: true, venta_id: ventaId });
    } catch (error) { 
        await pool.query('ROLLBACK'); res.status(500).json({ error: error.message }); 
    }
});

app.listen(PORT, () => { console.log(`✅ Backend corriendo en puerto ${PORT}`); });