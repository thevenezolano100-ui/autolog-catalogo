const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.DB_CONFIG);

// Test de conexión
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
    } else {
        console.log('✅ Base de datos conectada:', res.rows[0].now);
    }
});

module.exports = pool;