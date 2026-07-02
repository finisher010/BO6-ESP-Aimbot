/**
 * Test de contrat autonome du serveur (REST + WebSocket temps réel).
 * Démarre le serveur, vérifie l'annuaire, ouvre un WebSocket, déclenche un
 * changement de rôle et confirme la diffusion en direct. `npm test`.
 *
 * N'utilise que « ws » (déjà dépendance) et le fetch natif de Node.
 */
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
const ok = (n, c) => (c ? (pass++, console.log('  ✓', n)) : (fail++, console.log('  ✗ FAIL', n)));

async function main() {
  const srv = spawn('node', [require('path').join(__dirname, 'server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await sleep(700);

  try {
    // REST
    const dir = await (await fetch(`${BASE}/directory`)).json();
    ok('GET /directory → 5 employés', dir.employees.length === 5);
    ok('Paul 1002 est mécanicien', dir.employees.find((e) => e.id === '1002').role === 'mecanicien');

    // WebSocket : message initial + diffusion après changement
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const messages = [];
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));
    await sleep(300);
    ok('WS envoie l’annuaire à la connexion', messages.length === 1 && messages[0].type === 'directory');

    await fetch(`${BASE}/admin/set-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1002', role: 'chauffeur' }),
    });
    await sleep(300);
    ok('WS diffuse la mise à jour en temps réel', messages.length === 2);
    ok(
      'Le rôle de Paul est bien passé à chauffeur',
      messages[1].employees.find((e) => e.id === '1002').role === 'chauffeur'
    );

    ws.close();
  } finally {
    srv.kill();
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
