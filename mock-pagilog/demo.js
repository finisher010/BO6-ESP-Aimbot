/**
 * Petit scénario de démonstration : modifie des droits côté « PAGILOG » à
 * intervalle régulier. Lancez le serveur (npm start) dans un terminal, puis
 * ce script (npm run demo) dans un autre, et observez l'app (ou le serveur)
 * recevoir les changements en temps réel.
 */
const BASE = process.env.BASE || 'http://localhost:8787';
const TOKEN = process.env.API_TOKEN || '';

async function setRole(id, role) {
  const res = await fetch(`${BASE}/admin/set-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ id, role }),
  });
  const body = await res.json();
  console.log(`→ ${id} devient « ${role} »`, res.status, JSON.stringify(body.employee || body));
}

async function main() {
  const steps = [
    ['1002', 'chauffeur'],
    ['1005', 'gestionnaire'],
    ['1002', 'mecanicien'],
    ['1005', 'chauffeur'],
  ];
  console.log('Démo temps réel — modification de droits toutes les 4 s');
  for (const [id, role] of steps) {
    await setRole(id, role);
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log('Démo terminée.');
}

main().catch((e) => {
  console.error('Échec démo :', e.message);
  process.exit(1);
});
