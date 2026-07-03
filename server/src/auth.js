// Authentification par jeton (optionnelle).
// Si API_TOKEN est défini, l'en-tête « Authorization: Bearer <token> » est exigé
// sur les routes REST, et « ?token=<token> » sur la connexion WebSocket.

const API_TOKEN = process.env.API_TOKEN || '';

function tokenRequired() {
  return API_TOKEN.length > 0;
}

function checkRest(req) {
  if (!tokenRequired()) return true;
  return (req.headers['authorization'] || '') === `Bearer ${API_TOKEN}`;
}

function checkWs(url) {
  if (!tokenRequired()) return true;
  return url.searchParams.get('token') === API_TOKEN;
}

module.exports = { tokenRequired, checkRest, checkWs };
