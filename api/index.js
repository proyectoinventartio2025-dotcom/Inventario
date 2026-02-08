// Vercel Serverless Function entry point for Express
// Importa el servidor Express existente (CJS) y lo expone como ESM para Vercel
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const app = require('../backend/src/server.js');

export default app;
