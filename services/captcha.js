const axios = require('axios');

async function resolverCaptcha(siteKey, pageUrl) {
  const apiKey = process.env.CAPTCHA_API_KEY;
  
  try {
    // 1. Solicitar la resolución del CAPTCHA
    const reqRes = await axios.post(`https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}&json=1`);
    if (reqRes.data.status !== 1) throw new Error(reqRes.data.request);

    const requestId = reqRes.data.request;

    // 2. Esperar a que el token sea procesado
    while (true) {
      await new Promise(r => setTimeout(r, 5000));
      const tokenRes = await axios.get(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`);
      
      if (tokenRes.data.status === 1) {
        return tokenRes.data.request; // Token g-recaptcha-response
      }
      if (tokenRes.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(tokenRes.data.request);
      }
    }
  } catch (error) {
    console.error('[-] Error al resolver CAPTCHA:', error.message);
    return null;
  }
}

module.exports = { resolverCaptcha };