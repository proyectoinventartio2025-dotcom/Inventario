const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

// Generar JWT
const generarToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @route   POST /api/auth/register
// @desc    Registrar nuevo usuario
// @access  Public
const allowPublicRegister = process.env.ALLOW_PUBLIC_REGISTER === 'true' || process.env.NODE_ENV !== 'production';
const registerMiddlewares = allowPublicRegister ? [] : [protect, admin];

router.post('/register', ...registerMiddlewares, async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;

        // Verificar si el usuario ya existe
        const usuarioExiste = await User.findOne({ email });
        if (usuarioExiste) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Crear usuario
        const usuario = await User.create({
            nombre,
            email,
            password,
            rol: rol || 'operador'
        });

        // Retornar usuario y token
        res.status(201).json({
            success: true,
            user: {
                _id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            token: generarToken(usuario._id)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario',
            error: error.message
        });
    }
});

// @route   POST /api/auth/login
// @desc    Iniciar sesión
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar datos
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor ingresa email y contraseña'
            });
        }

        // Buscar usuario
        const usuario = await User.findOne({ email });

        if (!usuario || !usuario.active) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const passwordCorrecto = await usuario.compararPassword(password);

        if (!passwordCorrecto) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Retornar usuario y token
        res.json({
            success: true,
            user: {
                _id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            token: generarToken(usuario._id)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
});

// @route   GET /api/auth/me
// @desc    Obtener usuario actual
// @access  Private
router.get('/me', protect, async (req, res) => {
    res.json({
        success: true,
        user: {
            _id: req.user._id,
            nombre: req.user.nombre,
            email: req.user.email,
            rol: req.user.rol
        }
    });
});

module.exports = router;
