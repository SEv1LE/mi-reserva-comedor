const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  clave: { type: String, required: true },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', UsuarioSchema);