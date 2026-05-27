const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const config = require('../config');

// Configurar Cloudinary
cloudinary.config(config.CLOUDINARY_CONFIG);

// Configurar almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'autolog_repuestos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
    },
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, webp)'));
    }
});

// Middleware para manejar errores de multer
const manejarErrorMulter = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                mensaje: 'El archivo es demasiado grande. Máximo 5MB'
            });
        }
        return res.status(400).json({
            success: false,
            mensaje: `Error en la subida: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            mensaje: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    cloudinary,
    manejarErrorMulter
};
