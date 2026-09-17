const cron = require('node-cron');
const axios = require('axios');
const Usuario = require('../models/Usuario');
const { resolverCaptcha } = require('./captcha');

// Configuración general
const CAPTCHA_SITE_KEY = process.env.CAPTCHA_SITE_KEY || 'TU_RECAPTCHA_SITE_KEY_DEL_COMEDOR';
const URL_COMEDOR_PAGE = 'https://comedor.unsaac.edu.pe';
const URL_API_RESERVA = 'https://comedor.unsaac.edu.pe/api/reservar';

let tareaCron = null;
let horaReserva = 8;
let minutoReserva = 0;

async function procesarReservaUsuario(usuario, captchaToken) {
  try {
    const payload = {
      codigo: usuario.codigo,
      clave: usuario.clave,
      'g-recaptcha-response': captchaToken
    };

    const response = await axios.post(URL_API_RESERVA, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`[+] Reserva [${usuario.codigo}]:`, response.data);
    return { codigo: usuario.codigo, status: 'exito', data: response.data };
  } catch (error) {
    console.error(`[-] Error en reserva [${usuario.codigo}]:`, error.message);
    return { codigo: usuario.codigo, status: 'error', message: error.message };
  }
}

async function ejecutarDisparoMasivo() {
  console.log('[*] Iniciando ciclo de reserva automática...');

  const usuarios = await Usuario.find({ activo: true });
  if (usuarios.length === 0) {
    return console.log('[-] No hay usuarios activos registrados.');
  }

  console.log('[*] Solicitando resolución de CAPTCHA a 2Captcha...');
  const captchaToken = await resolverCaptcha(CAPTCHA_SITE_KEY, URL_COMEDOR_PAGE);

  if (!captchaToken) {
    return console.error('[-] No se pudo obtener el token CAPTCHA. Abortando disparo.');
  }

  console.log('[+] Token CAPTCHA obtenido con éxito. Disparando peticiones en paralelo...');

  const promesas = usuarios.map(u => procesarReservaUsuario(u, captchaToken));
  const resultados = await Promise.all(promesas);

  console.log('[+] Ciclo finalizado. Resumen:', resultados);
}

function programarHorario(hora, minuto) {
  horaReserva = parseInt(hora);
  minutoReserva = parseInt(minuto);

  if (tareaCron) {
    tareaCron.stop();
  }

  const expresionCron = `${minutoReserva} ${horaReserva} * * *`;

  tareaCron = cron.schedule(expresionCron, () => {
    ejecutarDisparoMasivo();
  }, {
    timezone: "America/Lima"
  });

  console.log(`[+] Reserva reprogramada para las ${horaReserva.toString().padStart(2, '0')}:${minutoReserva.toString().padStart(2, '0')}:00 hrs (America/Lima)`);
}

function obtenerHorarioActual() {
  return { hora: horaReserva, minuto: minutoReserva };
}

module.exports = { 
  iniciarProgramador: () => programarHorario(8, 0), 
  programarHorario, 
  obtenerHorarioActual, 
  ejecutarDisparoMasivo 
};