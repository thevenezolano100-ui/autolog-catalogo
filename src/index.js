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
// CREDENCIALES DE BASE DE DATOS EN LA NUBE (NEON)
// ===============================================
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_GSfl19XITPFj@ep-wispy-bonus-anshmeg3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', // <--- 1. TU ENLACE DE NEON AQUÍ
});

pool.query(`
    CREATE TABLE IF NOT EXISTS aplicaciones (
        producto_id INT, vehiculo_id INT, PRIMARY KEY (producto_id, vehiculo_id)
    )
`).catch(err => console.error("Aviso BD:", err));

// ===============================================
// CONFIGURACIÓN DE NUBE (CLOUDINARY)
// ===============================================
cloudinary.config({ 
  cloud_name: 'ddrqga65e',   // <--- 2. PEGA TU CLOUD NAME AQUÍ
  api_key: '781739566125483',         // <--- 3. PEGA TU API KEY AQUÍ
  api_secret: '0Yja9-EHbn8ESfClJEuKitLi35k'    // <--- 4. PEGA TU API SECRET AQUÍ
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'autolog_repuestos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  },
});
const upload = multer({ storage: storage });

// ===============================================
// SEGURIDAD Y PERFIL
// ===============================================
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2', [usuario, password]);
        if (result.rows.length > 0) res.json({ success: true, mensaje: 'Acceso concedido' });
        else res.status(401).json({ success: false, mensaje: 'Credenciales incorrectas' });
    } catch (err) { res.status(500).json({ error: 'Error en servidor' }); }
});

app.get('/api/usuario-admin', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, nombre_usuario FROM usuarios ORDER BY id ASC LIMIT 1');
        res.json(r.rows[0]);
    } catch (err) { res.status(500).send(err); }
});

app.put('/api/usuario/:id', async (req, res) => {
    const { id } = req.params;
    const { nuevo_nombre, nueva_contrasena } = req.body;
    try {
        await pool.query('UPDATE usuarios SET nombre_usuario = $1, contrasena = $2 WHERE id = $3', [nuevo_nombre, nueva_contrasena, id]);
        res.json({ success: true, mensaje: 'Perfil actualizado' });
    } catch (err) { res.status(500).send(err); }
});

// ===============================================
// MARCAS (CRUD COMPLETO)
// ===============================================
app.get('/api/marcas', async (req, res) => {
    try { const r = await pool.query('SELECT * FROM marcas ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).send(err); }
});
app.post('/api/marcas', async (req, res) => {
    try { await pool.query('INSERT INTO marcas (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});
app.put('/api/marcas/:id', async (req, res) => {
    try { await pool.query('UPDATE marcas SET nombre = $1 WHERE id = $2', [req.body.nombre, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});
app.delete('/api/marcas/:id', async (req, res) => {
    try {
        const check = await pool.query('SELECT * FROM productos WHERE marca_id = $1', [req.params.id]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'No se puede borrar porque tiene repuestos asignados.' });
        await pool.query('DELETE FROM marcas WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

// ===============================================
// CATEGORÍAS
// ===============================================
app.get('/api/categorias', async (req, res) => {
    try { const r = await pool.query('SELECT * FROM categorias ORDER BY nombre'); res.json(r.rows); } catch (err) { res.status(500).send(err); }
});
app.post('/api/categorias', async (req, res) => {
    try { await pool.query('INSERT INTO categorias (nombre) VALUES ($1)', [req.body.nombre]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});

// ===============================================
// VEHÍCULOS (CRUD)
// ===============================================
app.get('/api/vehiculos', async (req, res) => {
    try { const r = await pool.query('SELECT * FROM vehiculos ORDER BY marca_auto, modelo'); res.json(r.rows); } catch (err) { res.status(500).send(err); }
});
app.post('/api/vehiculos', async (req, res) => {
    const { marca_auto, modelo, anio_inicio, anio_fin, motor } = req.body;
    try { await pool.query('INSERT INTO vehiculos (marca_auto, modelo, anio_inicio, anio_fin, motor) VALUES ($1, $2, $3, $4, $5)', [marca_auto, modelo, anio_inicio, anio_fin, motor]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});
app.put('/api/vehiculos/:id', async (req, res) => {
    const { marca_auto, modelo, anio_inicio, anio_fin, motor } = req.body;
    try { await pool.query('UPDATE vehiculos SET marca_auto=$1, modelo=$2, anio_inicio=$3, anio_fin=$4, motor=$5 WHERE id=$6', [marca_auto, modelo, anio_inicio, anio_fin, motor, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});
app.delete('/api/vehiculos/:id', async (req, res) => {
    try { await pool.query('DELETE FROM aplicaciones WHERE vehiculo_id = $1', [req.params.id]); await pool.query('DELETE FROM vehiculos WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});

// ===============================================
// BUSCADOR EN CASCADA
// ===============================================
app.get('/api/vehiculos/marcas', async (req, res) => {
    try { const r = await pool.query('SELECT DISTINCT marca_auto FROM vehiculos ORDER BY marca_auto'); res.json(r.rows); } catch (err) { res.status(500).send(err); }
});
app.get('/api/vehiculos/modelos/:marca', async (req, res) => {
    try { const r = await pool.query('SELECT DISTINCT modelo FROM vehiculos WHERE marca_auto = $1 ORDER BY modelo', [req.params.marca]); res.json(r.rows); } catch (err) { res.status(500).send(err); }
});
app.get('/api/buscar-por-vehiculo', async (req, res) => {
    const { marca, modelo } = req.query;
    try {
        const query = `
            SELECT DISTINCT p.id, p.codigo_pieza, p.descripcion, p.imagen_url, p.precio, m.nombre as marca, c.nombre as categoria 
            FROM productos p JOIN marcas m ON p.marca_id = m.id JOIN categorias c ON p.categoria_id = c.id JOIN aplicaciones a ON p.id = a.producto_id JOIN vehiculos v ON a.vehiculo_id = v.id 
            WHERE v.marca_auto = $1 AND v.modelo = $2
        `;
        const r = await pool.query(query, [marca, modelo]); res.json(r.rows);
    } catch (err) { res.status(500).send(err); }
});

// ===============================================
// INVENTARIO (PRODUCTOS CON PRECIO Y CLOUDINARY)
// ===============================================
app.get('/api/productos', async (req, res) => {
    try {
        const query = `
            SELECT p.*, m.nombre AS marca, c.nombre AS categoria, COALESCE((SELECT json_agg(vehiculo_id) FROM aplicaciones WHERE producto_id = p.id), '[]') as vehiculos_compatibles
            FROM productos p LEFT JOIN marcas m ON p.marca_id = m.id LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.id DESC
        `;
        const r = await pool.query(query); res.json(r.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    const { codigo_pieza, marca_id, categoria_id, descripcion, vehiculos_compatibles, precio } = req.body;
    const vehiculos = JSON.parse(vehiculos_compatibles || '[]');
    const imagen_url = req.file ? req.file.path : null;
    try {
        const result = await pool.query(
            'INSERT INTO productos (codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', 
            [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0]
        );
        const nuevoId = result.rows[0].id;
        for (let vId of vehiculos) { await pool.query('INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES ($1, $2)', [nuevoId, vId]); }
        res.json({ success: true, mensaje: 'Repuesto guardado' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Error' }); }
});

app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { codigo_pieza, marca_id, categoria_id, descripcion, imagen_url_actual, vehiculos_compatibles, precio } = req.body;
    const vehiculos = JSON.parse(vehiculos_compatibles || '[]');
    let imagen_url = req.file ? req.file.path : imagen_url_actual;
    try {
        await pool.query(
            'UPDATE productos SET codigo_pieza=$1, marca_id=$2, categoria_id=$3, descripcion=$4, imagen_url=$5, precio=$6 WHERE id=$7', 
            [codigo_pieza, marca_id, categoria_id, descripcion, imagen_url, precio || 0, id]
        );
        await pool.query('DELETE FROM aplicaciones WHERE producto_id = $1', [id]);
        for (let vId of vehiculos) { await pool.query('INSERT INTO aplicaciones (producto_id, vehiculo_id) VALUES ($1, $2)', [id, vId]); }
        res.json({ success: true, mensaje: 'Actualizado con éxito' });
    } catch (err) { res.status(500).json({ error: 'Error' }); }
});

app.delete('/api/productos/:id', async (req, res) => {
    try { await pool.query('DELETE FROM aplicaciones WHERE producto_id = $1', [req.params.id]); await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err); }
});

app.listen(PORT, () => { console.log(`✅ Backend corriendo en puerto ${PORT}`); });