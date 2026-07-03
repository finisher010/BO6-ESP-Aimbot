/**
 * Serveur PAGILOG factice pour tester l'application de bout en bout.
 *
 * REST :
 *   GET  /directory                 → { employees: [...] }   (annuaire + droits)
 *   POST /directory/employees       → upsert d'un employé, puis diffusion WS
 *   POST /admin/set-role            → { id, role } : change un rôle, diffusion WS
 *   GET  /vehicles                  → parc (pour pullVehicles)
 *   POST /interventions             → réception des fiches (pour pushInterventions)
 *
 * WebSocket (temps réel) :
 *   ws://<host>:<port>/ws
 *   - à la connexion : envoie l'annuaire complet
 *   - à chaque changement : diffuse l'annuaire { type:'directory', employees:[...] }
 *
 * Auth : si la variable d'env API_TOKEN est définie, un en-tête
 *        Authorization: Bearer <token> est exigé. Sinon, tout est accepté.
 *
 * Aucune dépendance hormis « ws ».
 */
const http = require('http');
const { WebSocketServer } = require('ws');
const { directory, vehicles } = require('./seed');

const PORT = parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '0.0.0.0';
const API_TOKEN = process.env.API_TOKEN || '';

const state = {
  directory: directory.map((e) => ({ ...e })),
  vehicles: vehicles.map((v) => ({ ...v })),
  interventions: [],
};

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function authorized(req) {
  if (!API_TOKEN) return true;
  const h = req.headers['authorization'] || '';
  return h === `Bearer ${API_TOKEN}`;
}

function sendJson(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(data);
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
  return { type: 'directory', employees: state.directory };
}

function broadcastDirectory() {
  const msg = JSON.stringify(directoryPayload());
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
  log(`↔ diffusion annuaire à ${clients.size} client(s)`);
}

function upsertEmployee(emp) {
  const idx = state.directory.findIndex((e) => String(e.id) === String(emp.id));
  if (idx >= 0) state.directory[idx] = { ...state.directory[idx], ...emp };
  else state.directory.push(emp);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }
  if (!authorized(req)) return sendJson(res, 401, { error: 'token invalide' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/directory') {
      return sendJson(res, 200, { employees: state.directory });
    }
    if (req.method === 'POST' && path === '/directory/employees') {
      const emp = await readBody(req);
      if (!emp.id && !emp.name) return sendJson(res, 400, { error: 'id ou name requis' });
      upsertEmployee(emp);
      log('✎ upsert employé', emp.id || emp.name);
      broadcastDirectory();
      return sendJson(res, 200, { ok: true, employee: emp });
    }
    if (req.method === 'POST' && path === '/admin/set-role') {
      const { id, role, admin } = await readBody(req);
      const emp = state.directory.find((e) => String(e.id) === String(id));
      if (!emp) return sendJson(res, 404, { error: 'employé introuvable' });
      if (role !== undefined) {
        emp.role = role;
        delete emp.permissions;
      }
      if (admin !== undefined) emp.admin = admin;
      log(`✎ rôle de ${id} → ${role ?? emp.role}${admin ? ' (admin)' : ''}`);
      broadcastDirectory();
      return sendJson(res, 200, { ok: true, employee: emp });
    }
    if (req.method === 'GET' && path === '/vehicles') {
      return sendJson(res, 200, state.vehicles);
    }
    if (req.method === 'POST' && path === '/interventions') {
      const body = await readBody(req);
      const arr = Array.isArray(body.interventions) ? body.interventions : [];
      state.interventions.push(...arr);
      log(`⬇ ${arr.length} intervention(s) reçue(s) (total ${state.interventions.length})`);
      return sendJson(res, 200, { ok: true, received: arr.length });
    }
    if (req.method === 'GET' && path === '/') {
      return sendJson(res, 200, {
        service: 'mock-pagilog',
        employees: state.directory.length,
        vehicles: state.vehicles.length,
        wsClients: clients.size,
      });
    }
    return sendJson(res, 404, { error: 'route inconnue', path });
  } catch (e) {
    return sendJson(res, 500, { error: String(e && e.message) });
  }
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/ws') return socket.destroy();
  if (API_TOKEN) {
    const token = url.searchParams.get('token');
    if (token !== API_TOKEN) return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    clients.add(ws);
    log(`✔ client WS connecté (${clients.size})`);
    ws.send(JSON.stringify(directoryPayload()));
    ws.on('close', () => {
      clients.delete(ws);
      log(`✘ client WS déconnecté (${clients.size})`);
    });
  });
});

server.listen(PORT, HOST, () => {
  log(`Mock PAGILOG en écoute sur http://${HOST}:${PORT}`);
  log(`  REST  : GET http://localhost:${PORT}/directory`);
  log(`  WS    : ws://localhost:${PORT}/ws`);
  if (API_TOKEN) log('  Auth  : Bearer token EXIGÉ (API_TOKEN défini)');
});
