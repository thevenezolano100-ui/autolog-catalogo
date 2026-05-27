const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware para verificar token JWT
 * Se debe incluir en las rutas que requieran autenticación
 */
const verificarToken = (req, res, next) => {
    try {
        // Obtener token del header Authorization: Bearer <token>
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                mensaje: 'No se proporcionó token de autenticación' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                mensaje: 'Formato de token inválido' 
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, config.JWT.SECRET);
        
        // Agregar información del usuario al request
        req.usuario = decoded;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                mensaje: 'Token expirado. Por favor inicia sesión nuevamente' 
            });
        }
        
        return res.status(401).json({ 
            success: false, 
            mensaje: 'Token inválido' 
        });
    }
};

/**
 * Middleware opcional para verificar rol de administrador
 * Debe usarse después de verificarToken
 */
const esAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            mensaje: 'Acceso denegado. Se requieren permisos de administrador' 
        });
    }
    next();
};

module.exports = {
    verificarToken,
    esAdmin
};
