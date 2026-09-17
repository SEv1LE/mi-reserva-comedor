require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Usuario = require('./models/Usuario');
const { 
  iniciarProgramador, 
  programarHorario, 
  obtenerHorarioActual, 
  ejecutarDisparoMasivo 
} = require('./services/reservaEngine');

// 1. INICIALIZAR EXPRESS PRIMERO (Importante)
const app = express();

// 2. MIDDLEWARES
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 3. CONEXIÓN A MONGO DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[+] Conectado a MongoDB Atlas'))
  .catch(err => console.error('[-] Error de conexión:', err));

// 4. RUTAS DE CONFIGURACIÓN DE HORARIO
app.get('/api/config/horario', (req, res) => {
  res.json(obtenerHorarioActual());
});

app.post('/api/config/horario', (req, res) => {
  const { hora, minuto } = req.body;
  if (hora === undefined || minuto === undefined) {
    return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
  }
  programarHorario(hora, minuto);
  res.json({ status: 'ok', message: `Hora actualizada a las ${hora}:${minuto}` });
});

// 5. RUTAS DE USUARIOS
app.get('/api/usuarios', async (req, res) => {
  const usuarios = await Usuario.find().sort({ createdAt: -1 });
  res.json(usuarios);
});

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

app.delete('/api/usuarios/:codigo', async (req, res) => {
  await Usuario.deleteOne({ codigo: req.params.codigo });
  res.json({ status: 'ok' });
});

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

app.get('/api/usuarios/exportar', async (req, res) => {
  const usuarios = await Usuario.find({}, { _id: 0, codigo: 1, clave: 1 });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=usuarios_comedor.json');
  res.send(JSON.stringify(usuarios, null, 2));
});

// 6. ENDPOINT DISPARO MANUAL
app.post('/api/reservar-ahora', async (req, res) => {
  ejecutarDisparoMasivo();
  res.json({ status: 'ok', message: 'Disparo de reserva iniciado manualmente.' });
});

// 7. ARRANQUE DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[+] Servidor corriendo en puerto ${PORT}`);
  iniciarProgramador();
});