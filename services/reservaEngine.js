const cron = require('node-cron');
const axios = require('axios');
const Usuario = require('../models/Usuario');
const { resolverCaptcha } = require('./captcha');

// Configuración del comedor de la universidad
const CAPTCHA_SITE_KEY = 'TU_RECAPTCHA_SITE_KEY_DEL_COMEDOR'; // Cambia por el sitekey del formulario
const URL_COMEDOR_PAGE = 'https://comedor.unsaac.edu.pe'; // URL donde está el formulario
const URL_API_RESERVA = 'https://comedor.unsaac.edu.pe/api/reservar'; // Endpoint final de reserva

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

  // 1. Obtener alumnos activos
  const usuarios = await Usuario.find({ activo: true });
  if (usuarios.length === 0) {
    return console.log('[-] No hay usuarios activos registrados.');
  }

  // 2. Resolver un token CAPTCHA mediante la API de 2Captcha
  console.log('[*] Solicitando resolución de CAPTCHA a 2Captcha...');
  const captchaToken = await resolverCaptcha(CAPTCHA_SITE_KEY, URL_COMEDOR_PAGE);

  if (!captchaToken) {
    return console.error('[-] No se pudo obtener el token CAPTCHA. Abortando disparo.');
  }

  console.log('[+] Token CAPTCHA obtenido con éxito. Disparando peticiones en paralelo...');

  // 3. Disparo en paralelo para todos los usuarios utilizando el token resuelto
  const promesas = usuarios.map(u => procesarReservaUsuario(u, captchaToken));
  const resultados = await Promise.all(promesas);

  console.log('[+] Ciclo finalizado. Resumen:', resultados);
}

// Programador de tareas: Ejecuta a las 08:00:00 AM todos los días (Hora Perú / UTC-5)
function iniciarProgramador() {
  cron.schedule('0 8 * * *', () => {
    ejecutarDisparoMasivo();
  }, {
    timezone: "America/Lima"
  });
  console.log('[+] Cron Job activo: Programado para las 08:00:00 AM (America/Lima)');
}

module.exports = { iniciarProgramador, ejecutarDisparoMasivo };