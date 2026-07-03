/**
 * API gratuite pour l'application (employés/droits, parc, entretien).
 *
 * REST :
 *   GET    /health
 *   GET    /roles
 *   GET    /directory                    → { employees: [...] }
 *   POST   /directory/employees          → upsert d'un employé (+ diffusion WS)
 *   DELETE /directory/employees/:id       → suppression (+ diffusion WS)
 *   POST   /admin/set-role               → { id, role, admin } (+ diffusion WS)
 *   GET    /vehicles                     → parc
 *   POST   /vehicles                     → upsert d'un véhicule
 *   DELETE /vehicles/:key                → suppression (pagilog_id ou immatriculation)
 *   GET    /interventions                → historique
 *   POST   /interventions                → ajout ({ interventions: [...] })
 *
 * WebSocket (temps réel) : ws://host:port/ws
 *   - à la connexion : envoie l'annuaire ;
 *   - à chaque changement d'annuaire : diffuse { type:'directory', employees:[...] }.
 *
 * Persistance : fichier JSON (DB_PATH). Auth : jeton optionnel (API_TOKEN).
 * Dépendance unique : « ws ».
 */
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { Store } = require('./store');
const { ROLES } = require('./roles');
const { checkRest, checkWs, tokenRequired } = require('./auth');

const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'db.json');

const store = new Store(DB_PATH);

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

function sendJson(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// --- WebSocket ---
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

function directoryPayload() {
  return { type: 'directory', employees: store.getEmployees() };
}
function broadcastDirectory() {
  const msg = JSON.stringify(directoryPayload());
  for (const ws of clients) if (ws.readyState === ws.OPEN) ws.send(msg);
  log(`↔ annuaire diffusé à ${clients.size} client(s)`);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  // Route publique : /health (pas d'auth, utile pour le monitoring des hébergeurs).
  if (req.method === 'GET' && (p === '/health' || p === '/')) {
    return sendJson(res, 200, {
      service: 'fleet-api',
      status: 'ok',
      employees: store.getEmployees().length,
      vehicles: store.getVehicles().length,
      wsClients: clients.size,
      authRequired: tokenRequired(),
    });
  }

  if (!checkRest(req)) return sendJson(res, 401, { error: 'jeton invalide' });

  try {
    if (req.method === 'GET' && p === '/roles') return sendJson(res, 200, { roles: ROLES });

    if (req.method === 'GET' && p === '/directory') {
      return sendJson(res, 200, { employees: store.getEmployees() });
    }
    if (req.method === 'POST' && p === '/directory/employees') {
      const emp = await readBody(req);
      if (!emp.id && !emp.name) return sendJson(res, 400, { error: 'id ou name requis' });
      const saved = store.upsertEmployee(emp);
      log('✎ upsert employé', saved.id);
      broadcastDirectory();
      return sendJson(res, 200, { ok: true, employee: saved });
    }
    if (req.method === 'DELETE' && p.startsWith('/directory/employees/')) {
      const id = decodeURIComponent(p.split('/').pop());
      const removed = store.removeEmployee(id);
      if (removed) broadcastDirectory();
      return sendJson(res, removed ? 200 : 404, { ok: removed });
    }
    if (req.method === 'POST' && p === '/admin/set-role') {
      const { id, role, admin } = await readBody(req);
      const e = store.setRole(id, role, admin);
      if (!e) return sendJson(res, 404, { error: 'employé introuvable' });
      log(`✎ rôle de ${id} → ${role ?? e.role}${admin ? ' (admin)' : ''}`);
      broadcastDirectory();
      return sendJson(res, 200, { ok: true, employee: e });
    }

    if (req.method === 'GET' && p === '/vehicles') return sendJson(res, 200, store.getVehicles());
    if (req.method === 'POST' && p === '/vehicles') {
      const v = await readBody(req);
      if (!v.immatriculation && !v.pagilog_id) {
        return sendJson(res, 400, { error: 'immatriculation ou pagilog_id requis' });
      }
      return sendJson(res, 200, { ok: true, vehicle: store.upsertVehicle(v) });
    }
    if (req.method === 'DELETE' && p.startsWith('/vehicles/')) {
      const key = decodeURIComponent(p.split('/').pop());
      const removed = store.removeVehicle(key);
      return sendJson(res, removed ? 200 : 404, { ok: removed });
    }

    if (req.method === 'GET' && p === '/interventions') {
      return sendJson(res, 200, { interventions: store.getInterventions() });
    }
    if (req.method === 'POST' && p === '/interventions') {
      const body = await readBody(req);
      const n = store.addInterventions(body.interventions);
      log(`⬇ ${n} intervention(s) reçue(s)`);
      return sendJson(res, 200, { ok: true, received: n });
    }

    return sendJson(res, 404, { error: 'route inconnue', path: p });
  } catch (e) {
    return sendJson(res, 500, { error: String(e && e.message) });
  }
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/ws' || !checkWs(url)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    clients.add(ws);
    log(`✔ WS connecté (${clients.size})`);
    ws.send(JSON.stringify(directoryPayload()));
    ws.on('close', () => {
      clients.delete(ws);
      log(`✘ WS déconnecté (${clients.size})`);
    });
  });
});

// Sauvegarde le tampon à l'arrêt (déploiements, redémarrages).
function shutdown() {
  log('Arrêt : sauvegarde des données…');
  store.flush();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    log(`fleet-api en écoute sur http://${HOST}:${PORT}`);
    log(`  REST : http://localhost:${PORT}/directory`);
    log(`  WS   : ws://localhost:${PORT}/ws`);
    log(`  DB   : ${DB_PATH}`);
    log(`  Auth : ${tokenRequired() ? 'jeton EXIGÉ' : 'ouverte (définissez API_TOKEN pour sécuriser)'}`);
  });
}

module.exports = { server, store };
