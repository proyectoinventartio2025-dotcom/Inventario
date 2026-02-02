const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        // Mensaje de ÉXITO destacado (Fondo Verde, Texto Negro)
        console.log('\n');
        console.log('\x1b[42m\x1b[30m%s\x1b[0m', ' ========================================= ');
        console.log('\x1b[42m\x1b[30m%s\x1b[0m', '      CONEXIÓN A MONGODB EXITOSA         ');
        console.log('\x1b[42m\x1b[30m%s\x1b[0m', ' ========================================= ');
        console.log(`\x1b[32m ► Host: \x1b[0m${conn.connection.host}`);
        console.log(`\x1b[32m ► DB:   \x1b[0m${conn.connection.name}`);
        console.log('\n');

    } catch (error) {
        // Mensaje de ERROR destacado (Fondo Rojo, Texto Blanco)
        console.log('\n');
        console.log('\x1b[41m\x1b[37m%s\x1b[0m', ' ========================================= ');
        console.log('\x1b[41m\x1b[37m%s\x1b[0m', '      ERROR DE CONEXIÓN A MONGODB        ');
        console.log('\x1b[41m\x1b[37m%s\x1b[0m', ' ========================================= ');
        console.error(`\x1b[31m ► Error: ${error.message}\x1b[0m`);
        
        // Ayuda específica para errores comunes
        if (error.message.includes('bad auth') || error.code === 8000) {
            console.log('\x1b[33m%s\x1b[0m', '⚠️  POSIBLE CAUSA: Usuario o contraseña incorrectos en .env');
        } else if (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
            console.log('\x1b[33m%s\x1b[0m', '⚠️  POSIBLE CAUSA: Tu IP no está permitida en MongoDB Atlas.');
            console.log('\x1b[33m%s\x1b[0m', '👉  Solución: Ve a "Network Access" en Atlas y agrega tu IP.');
        }

        console.log('\n');
        process.exit(1);
    }
};

module.exports = connectDB;
