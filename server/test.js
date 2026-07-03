/**
 * Tests de l'API : persistance du magasin + contrat REST/WebSocket +
 * conservation des données après redémarrage. `npm test`.
 * N'utilise que « ws » et les modules Node.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { Store } = require('./src/store');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const ok = (n, c) => (c ? (pass++, console.log('  ✓', n)) : (fail++, console.log('  ✗ FAIL', n)));

function tmpDb() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fleetdb-')), 'db.json');
}

async function testStore() {
  console.log('store (persistance) :');
  const db = tmpDb();
  const s1 = new Store(db);
  ok('semé avec 5 employés', s1.getEmployees().length === 5);
  s1.upsertEmployee({ id: 'x1', name: 'Test', role: 'chauffeur' });
  s1.setRole('1002', 'chauffeur');
  s1.flush();

  // Recharge depuis le même fichier → données conservées.
  const s2 = new Store(db);
  ok('nouvel employé persistant', s2.getEmployees().some((e) => e.id === 'x1'));
  ok('changement de rôle persistant', s2.getEmployees().find((e) => e.id === '1002').role === 'chauffeur');
  ok('suppression', s2.removeEmployee('x1') && !s2.getEmployees().some((e) => e.id === 'x1'));
}

function startServer(db, port) {
  const child = spawn('node', [path.join(__dirname, 'src', 'server.js')], {
    env: { ...process.env, DB_PATH: db, PORT: String(port), API_TOKEN: '' },
    stdio: 'ignore',
  });
  return child;
}

async function testServer() {
  console.log('serveur (REST + WS + redémarrage) :');
  const db = tmpDb();
  const port = 8793;
  const base = `http://127.0.0.1:${port}`;

  let srv = startServer(db, port);
  await sleep(700);

  const health = await (await fetch(`${base}/health`)).json();
  ok('/health OK', health.status === 'ok' && health.employees === 5);

  const roles = await (await fetch(`${base}/roles`)).json();
  ok('/roles renvoie le catalogue', roles.roles.length >= 5);

  // WebSocket : message initial + diffusion sur changement
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const msgs = [];
  ws.on('message', (d) => msgs.push(JSON.parse(d.toString())));
  await sleep(300);
  ok('WS envoie l’annuaire à la connexion', msgs.length === 1 && msgs[0].type === 'directory');

  await fetch(`${base}/directory/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: '9001', name: 'Nouveau', role: 'mecanicien' }),
  });
  await sleep(300);
  ok('WS diffuse en temps réel après ajout', msgs.length === 2);
  ok('l’employé ajouté est présent', msgs[1].employees.some((e) => e.id === '9001'));
  ws.close();

  // Véhicules + interventions
  await fetch(`${base}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ immatriculation: 'ZZ-999-ZZ', marque: 'MAN', km: 1000 }),
  });
  const veh = await (await fetch(`${base}/vehicles`)).json();
  ok('véhicule ajouté', veh.some((v) => v.immatriculation === 'ZZ-999-ZZ'));

  await fetch(`${base}/interventions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interventions: [{ immatriculation: 'ZZ-999-ZZ', date: '2026-07-02' }] }),
  });
  const itv = await (await fetch(`${base}/interventions`)).json();
  ok('intervention reçue', itv.interventions.length === 1);

  // Redémarrage → persistance
  srv.kill('SIGTERM');
  await sleep(500);
  srv = startServer(db, port);
  await sleep(700);
  const after = await (await fetch(`${base}/directory`)).json();
  ok('données conservées après redémarrage', after.employees.some((e) => e.id === '9001'));
  srv.kill('SIGTERM');
  await sleep(200);
}

(async () => {
  await testStore();
  await testServer();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
