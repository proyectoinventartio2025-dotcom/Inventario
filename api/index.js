// Vercel Serverless Function entry point for Express
// Importa el servidor Express existente (CJS) y lo expone como ESM para Vercel

import app from '../backend/src/server.js';

export default app;
