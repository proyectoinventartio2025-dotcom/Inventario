const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener token del header
            token = req.headers.authorization.split(' ')[1];

            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Obtener usuario del token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user || !req.user.active) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autorizado o inactivo'
                });
            }

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado, token inválido'
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado, no hay token'
        });
    }
};

// Middleware para verificar rol de admin
const admin = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo administradores'
        });
    }
};

module.exports = { protect, admin };
