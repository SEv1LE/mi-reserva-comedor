// index.js
const targetTimeStr = process.env.TARGET_TIME;
const targetTime = new Date(targetTimeStr).getTime();

async function esperarHoraExacta() {
  console.log(`[+] Esperando hasta la hora objetivo: ${targetTimeStr}`);
  
  while (true) {
    const ahora = Date.now();
    const diferencia = targetTime - ahora;

    if (diferencia <= 0) {
      console.log(`[!] ¡Hora alcanzada! Disparando peticiones a las: ${new Date().toISOString()}`);
      break;
    }

    // Si faltan más de 50ms, dormimos un poco; si falta menos, hacemos bucle continuo para no perder precisión
    if (diferencia > 50) {
      await new Promise(resolve => setTimeout(resolve, Math.min(diferencia - 20, 1000)));
    }
  }
}

async function dispararReservas() {
  await esperarHoraExacta();

  // Lista de usuarios/tokens a reservar en paralelo
  const usuarios = [
    { id: "usuario_1", token: "bearer_token_1" },
    { id: "usuario_2", token: "bearer_token_2" },
    { id: "usuario_3", token: "bearer_token_3" }
  ];

  // Disparo simultáneo con Promise.all
  const peticiones = usuarios.map(user => 
    fetch("https://api.comedor.com/reserva", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({ codigoEstudiante: user.id })
    })
    .then(res => res.json())
    .then(data => console.log(`[+] Respuesta ${user.id}:`, data))
    .catch(err => console.error(`[-] Error ${user.id}:`, err))
  );

  await Promise.all(peticiones);
  console.log("[+] Proceso completado.");
}

dispararReservas();