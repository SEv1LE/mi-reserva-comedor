require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Usuario = require('./models/Usuario');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[+] Conectado a MongoDB Atlas'))
  .catch(err => console.error('[-] Error de conexión:', err));

// Obtener usuarios
app.get('/api/usuarios', async (req, res) => {
  const usuarios = await Usuario.find().sort({ createdAt: -1 });
  res.json(usuarios);
});

// Guardar o actualizar un usuario
app.post('/api/usuarios', async (req, res) => {
  const { codigo, clave } = req.body;
  try {
    const usuario = await Usuario.findOneAndUpdate(
      { codigo },
      { clave, activo: true },
      { upsert: true, new: true }
    );
    res.json({ status: 'ok', usuario });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Eliminar usuario
app.delete('/api/usuarios/:codigo', async (req, res) => {
  await Usuario.deleteOne({ codigo: req.params.codigo });
  res.json({ status: 'ok' });
});

// Importar lista masiva JSON
app.post('/api/usuarios/importar', async (req, res) => {
  const { usuarios } = req.body;
  try {
    const operaciones = usuarios.map(u => ({
      updateOne: {
        filter: { codigo: u.codigo },
        update: { clave: u.clave, activo: true },
        upsert: true
      }
    }));
    await Usuario.bulkWrite(operaciones);
    res.json({ status: 'ok', count: usuarios.length });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Exportar usuarios a JSON
app.get('/api/usuarios/exportar', async (req, res) => {
  const usuarios = await Usuario.find({}, { _id: 0, codigo: 1, clave: 1 });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=usuarios_comedor.json');
  res.send(JSON.stringify(usuarios, null, 2));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[+] Servidor corriendo en puerto ${PORT}`));