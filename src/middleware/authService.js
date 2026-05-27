const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const config = require('../config');

/**
 * Genera un hash seguro para la contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} - Hash de la contraseña
 */
const generarHashPassword = async (password) => {
    const salt = await bcrypt.genSalt(12); // 12 rounds para mayor seguridad
    return await bcrypt.hash(password, salt);
};

/**
 * Compara una contraseña con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado en la base de datos
 * @returns {Promise<boolean>} - true si coinciden
 */
const compararPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Genera un token JWT para el usuario
 * @param {Object} usuario - Datos del usuario (id, nombre_usuario, rol)
 * @returns {string} - Token JWT
 */
const generarToken = (usuario) => {
    const payload = {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol || 'user'
    };

    return jwt.sign(payload, config.JWT.SECRET, {
        expiresIn: config.JWT.EXPIRES_IN
    });
};

/**
 * Servicio de autenticación de usuarios
 */
const authService = {
    /**
     * Autentica un usuario con sus credenciales
     * @param {string} usuario - Nombre de usuario
     * @param {string} password - Contraseña
     * @returns {Promise<Object>} - Resultado con token o error
     */
    login: async (usuario, password) => {
        try {
            // Buscar usuario por nombre
            const result = await pool.query(
                'SELECT id, nombre_usuario, contrasena, rol FROM usuarios WHERE nombre_usuario = $1',
                [usuario]
            );

            if (result.rows.length === 0) {
                return {
                    success: false,
                    mensaje: 'Credenciales incorrectas'
                };
            }

            const user = result.rows[0];

            // Verificar si la contraseña está hasheada (longitud típica de bcrypt es 60 caracteres)
            let passwordValido = false;
            if (user.contrasena && user.contrasena.length === 60) {
                // Contraseña hasheada
                passwordValido = await compararPassword(password, user.contrasena);
            } else {
                // Contraseña en texto plano (migración pendiente)
                passwordValido = password === user.contrasena;
            }

            if (!passwordValido) {
                return {
                    success: false,
                    mensaje: 'Credenciales incorrectas'
                };
            }

            // Generar token JWT
            const token = generarToken({
                id: user.id,
                nombre_usuario: user.nombre_usuario,
                rol: user.rol || 'admin'
            });

            return {
                success: true,
                mensaje: 'Acceso concedido',
                data: {
                    token,
                    usuario: {
                        id: user.id,
                        nombre_usuario: user.nombre_usuario,
                        rol: user.rol || 'admin'
                    }
                }
            };
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    },

    /**
     * Actualiza la contraseña de un usuario con hash seguro
     * @param {number} userId - ID del usuario
     * @param {string} nuevaPassword - Nueva contraseña
     * @returns {Promise<Object>} - Resultado de la operación
     */
    actualizarPassword: async (userId, nuevaPassword) => {
        try {
            const hash = await generarHashPassword(nuevaPassword);
            
            await pool.query(
                'UPDATE usuarios SET contrasena = $1 WHERE id = $2',
                [hash, userId]
            );

            return {
                success: true,
                mensaje: 'Contraseña actualizada correctamente'
            };
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            throw error;
        }
    },

    /**
     * Hashea todas las contraseñas existentes en la base de datos
     * Útil para migración de contraseñas en texto plano a hasheadas
     */
    migrarPasswords: async () => {
        try {
            const result = await pool.query('SELECT id, contrasena FROM usuarios');
            
            for (const user of result.rows) {
                // Solo hashear si no está ya hasheada
                if (user.contrasena && user.contrasena.length !== 60) {
                    const hash = await generarHashPassword(user.contrasena);
                    await pool.query(
                        'UPDATE usuarios SET contrasena = $1 WHERE id = $2',
                        [hash, user.id]
                    );
                    console.log(`✅ Password hasheada para usuario ID: ${user.id}`);
                }
            }
            
            console.log('✅ Migración de contraseñas completada');
        } catch (error) {
            console.error('❌ Error en migración de passwords:', error);
            throw error;
        }
    }
};

module.exports = authService;
