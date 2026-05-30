const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.options('*', cors()); 
app.use(express.json());

// ===============================================
// 1. CREDENCIALES (PEGALAS AQUÍ)
// ===============================================
const ENLACE_NEON = 'postgresql://neondb_owner:npg_GSfl19XITPFj@ep-wispy-bonus-anshmeg3.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const CLOUD_NAME = 'ddrqga65e';
const API_KEY = '781739566125483';
const API_SECRET = '0Yja9-EHbn8ESfClJEuKitLi35k';

app.get('/', (req, res) => { res.status(200).send('✅ Servidor AUTOLOG activo con protección Neon.'); });

// ===============================================
// 2. CONEXIÓN BLINDADA A NEON.TECH
// ===============================================
let pool;
try {
    if (!ENLACE_NEON.startsWith('postgres')) throw new Error("Enlace no válido");
    
    // CONFIGURACIÓN AVANZADA: Tolerancia a desconexiones
    pool = new Pool({ 
        connectionString: ENLACE_NEON,
        connectionTimeoutMillis: 15000, // Espera hasta 15s si Neon está dormido
        idleTimeoutMillis: 30000 // Libera memoria si no se usa
    });

    // ESCUDO ANTI-CAÍDAS CRÍTICO (Evita que Render colapse)
    pool.on('error', (err) => {
        console.error('⚠️ Aviso: Neon cortó la conexión inactiva, pero el servidor Node sigue vivo.', err.message);
    });
    
    const inicializarEstructura = async () => {
        const consultas = [
            `CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nombre_usuario VARCHAR(50), contrasena VARCHAR(50));`,
            `CREATE TABLE IF NOT EXISTS marcas (id SERIAL PRIMARY KEY, nombre VARCHAR(100));`,
            `CREATE TABLE IF NOT EXISTS categorias (id SERIAL PRIMARY KEY, nombre VARCHAR(100));`,
            `CREATE TABLE IF NOT EXISTS productos (id SERIAL PRIMARY KEY, codigo_pieza VARCHAR(100), descripcion TEXT, precio DECIMAL(10,2), stock INT DEFAULT 0, marca_id INT, categoria_id INT, imagen_url TEXT);`,
            `CREATE TABLE IF NOT EXISTS vehiculos (id SERIAL PRIMARY KEY, marca_auto VARCHAR(100), modelo VARCHAR(100));`,
            `CREATE TABLE IF NOT EXISTS aplicaciones (producto_id INT, vehiculo_id INT, PRIMARY KEY (producto_id, vehiculo_id));`,
            `CREATE TABLE IF NOT EXISTS ventas (id SERIAL PRIMARY KEY, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP, metodo_pago VARCHAR(50), total DECIMAL(10, 2), comprobante_url TEXT);`,
            `CREATE TABLE IF NOT EXISTS detalles_venta (id SERIAL PRIMARY KEY, venta_id INT, producto_id INT, cantidad INT, precio_unitario DECIMAL(10, 2), subtotal DECIMAL(10, 2));`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'Pendiente';`,
            `ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS motor VARCHAR(100) DEFAULT 'N/A';`
        ];
        for (let sql of consultas) {
            try { await pool.query(sql); } catch(e) { console.log(`Aviso BD: ${e.message}`); }
        }
    };
    inicializarEstructura();
} catch (error) {
    pool = { query: async () => { throw new Error("Base de datos inactiva.") } };
}

let upload;
if (CLOUD_NAME === 'TU_CLOUD_NAME' || !CLOUD_NAME) { upload = multer({ storage: multer.memoryStorage() }); } 
else {
    cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
    const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'autolog_repuestos' } });
    upload = multer({ storage: storage });
}

// ===============================================
// RUTAS Y ENDPOINTS
// ===============================================
app.post('/api/login', async (req, res) => { const { usuario, password } = req.body; try { const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [usuario, password]); if (result.rows.length > 0) res.json({ success: true, mensaje: 'Acceso concedido' }); else res.status(401).json({ success: false, mensaje: 'Credenciales incorrectas' }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get('/api/marcas', async (req, res) => { try { const r = await pool.query('SELECT * FROM marcas ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/marcas', async (req, res) => { try { await pool.query('INSERT INTO marcas (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/marcas/:id', async (req, res) => { try { await pool.query('DELETE FROM marcas WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get('/api/categorias', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorias ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/categorias', async (req, res) => { try { await pool.query('INSERT INTO categorias (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/categorias/:id', async (req, res) => { try { await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// 🚗 VEHÍCULOS
app.get('/api/vehiculos', async (req, res) => { try { const r = await pool.query('SELECT * FROM vehiculos ORDER BY marca_auto, modelo'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/vehiculos', async (req, res) => { const { marca_auto, modelo } = req.body; if(!marca_auto || !modelo) return res.status(400).json({ error: "Faltan datos" }); try { await pool.query('INSERT INTO vehiculos (marca_auto, modelo) VALUES ($1, $2)', [marca_auto, modelo]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/vehiculos/:id', async (req, res) => { try { await pool.query('DELETE FROM aplicaciones WHERE vehiculo_id = $1', [req.params.id]); await pool.query('DELETE FROM vehiculos WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.get('/api/productos', async (req, res) => { try { const query = `SELECT p.*, m.nombre AS marca, c.nombre AS categoria, COALESCE((SELECT json_agg(v.id) FROM aplicaciones a JOIN vehiculos v ON a.vehiculo_id = v.id WHERE a.producto_id = p.id), '[]') as vehiculos_ids, COALESCE((SELECT string_agg(v.marca_auto || ' ' || v.modelo, ', ') FROM aplicaciones a JOIN vehiculos v ON a.vehiculo_id = v.id WHERE a.producto_id = p.id), '') as vehiculos_nombres FROM productos p LEFT JOIN marcas m ON p.marca_id = m.id LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.id DESC`; const r = await pool.query(query); res.json(r.rows); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/productos', upload.single('imagen'), async (req, res) => { const { codigo_pieza, marca_id, categoria_id, descripcion, precio, stock, vehiculos_compatibles } = req.body; const imagen_url = req.file && req.file.path ? req.file.path : null; let vehiculos = []; try { vehiculos = JSON.parse(vehiculos_compatibles || '[]'); } catch(e){} try { await pool.query('BEGIN'); const r = await pool.query('INSERT INTO productos (codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, stock || 0]); const productoId = r.rows[0].id; for (let vId of vehiculos) { await pool.query('INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES ($1, $2)', [productoId, vId]); } await pool.query('COMMIT'); res.json({ success: true }); } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: err.message }); } });
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => { const { id } = req.params; const { codigo_pieza, marca_id, categoria_id, descripcion, imagen_url_actual, precio, stock, vehiculos_compatibles } = req.body; let imagen_url = req.file && req.file.path ? req.file.path : imagen_url_actual; let vehiculos = []; try { vehiculos = JSON.parse(vehiculos_compatibles || '[]'); } catch(e){} try { await pool.query('BEGIN'); await pool.query('UPDATE productos SET codigo_pieza=$1, marca_id=$2, categoria_id=$3, descripcion=$4, imagen_url=$5, precio=$6, stock=$7 WHERE id=$8', [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, stock || 0, id]); await pool.query('DELETE FROM aplicaciones WHERE producto_id = $1', [id]); for (let vId of vehiculos) { await pool.query('INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES ($1, $2)', [id, vId]); } await pool.query('COMMIT'); res.json({ success: true }); } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: err.message }); } });
app.delete('/api/productos/:id', async (req, res) => { try { await pool.query('DELETE FROM aplicaciones WHERE producto_id = $1', [req.params.id]); await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); } });

app.post('/api/ventas', upload.single('comprobante'), async (req, res) => { const { metodo_pago, total, detalles } = req.body; let productosVendidos = []; try { productosVendidos = JSON.parse(detalles || '[]'); } catch(e) { return res.status(400).json({ error: "Detalles corruptos" }); } const comprobante_url = req.file && req.file.path ? req.file.path : null; try { await pool.query('BEGIN'); const resVenta = await pool.query("INSERT INTO ventas (metodo_pago, total, comprobante_url, estado) VALUES ($1, $2, $3, 'Pendiente') RETURNING id", [metodo_pago, total, comprobante_url]); const ventaId = resVenta.rows[0].id; for (let item of productosVendidos) { await pool.query('INSERT INTO detalles_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)', [ventaId, item.id, item.cantidad, item.precio, item.cantidad * item.precio]); await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]); } await pool.query('COMMIT'); res.json({ success: true, venta_id: ventaId }); } catch (error) { await pool.query('ROLLBACK'); res.status(500).json({ error: error.message }); } });
app.get('/api/ventas', async (req, res) => { try { const r = await pool.query('SELECT * FROM ventas ORDER BY id DESC LIMIT 100'); res.json(r.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/ventas/:id/validar', async (req, res) => { try { await pool.query("UPDATE ventas SET estado = 'Validado' WHERE id = $1", [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.listen(PORT, () => { console.log(`✅ Servidor en puerto ${PORT}`); });