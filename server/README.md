# fleet-api — backend gratuit (REST + WebSocket temps réel)

API prête à l'emploi qui fait **tout fonctionner gratuitement** en attendant (ou à la
place de) PAGILOG : **employés & droits**, **parc**, **entretien**, avec
**synchronisation temps réel** vers l'application.

- **Zéro service payant** : persistance dans un simple fichier JSON, une seule
  dépendance (`ws`). Fonctionne sur votre PC, votre réseau local, un Raspberry Pi
  ou une offre d'hébergement gratuite.
- **Même contrat** que celui attendu par l'app (`/directory`, `/ws`,
  `/vehicles`, `/interventions`) : rien à changer côté application, juste l'URL.

## Démarrer gratuitement (le plus simple : votre PC / réseau local)

Prérequis : **Node.js 18+**.

```bash
cd server
npm install
npm start        # http://localhost:8787  +  ws://localhost:8787/ws
npm test         # 12 tests : persistance + REST + WebSocket + redémarrage
```

C'est **100 % gratuit et sans compte** : laissez ce serveur tourner sur un PC
allumé, et tous les téléphones du même Wi‑Fi s'y connectent. Les données sont
dans `server/data/db.json` (sauvegardez ce fichier pour une copie de sécurité).

## Brancher l'application

Écran **PAGILOG → Gestion centralisée des employés** :

1. **URL de l'API** : `http://<IP-du-PC>:8787` (l'IP locale du PC, pas `localhost`,
   depuis un téléphone — ex. `http://192.168.1.20:8787`).
2. **URL WebSocket** : `ws://<IP-du-PC>:8787/ws`.
3. Activez **« Gérer les employés depuis PAGILOG »**, enregistrez.

Les employés apparaissent (badge « PAGILOG ») et se mettent à jour **en temps réel**.

> PC et téléphone sur le **même réseau**, port `8787` autorisé par le pare-feu.

## Héberger gratuitement sur Internet (optionnel)

| Hébergeur | Gratuit | Persistance | Note |
|-----------|---------|-------------|------|
| **Votre PC / LAN** | ✅ total | ✅ `data/db.json` | Le plus simple, rien à créer |
| **Fly.io** | ✅ (petit) | ✅ volume | `fly.toml` fourni ; `fly volumes create fleet_data --size 1` |
| **Render** | ✅ | ⚠️ disque payant | `render.yaml` fourni ; s'endort après inactivité |
| **Railway / VPS** | selon offre | ✅ | Utiliser le `Dockerfile` |

Toutes les configs sont dans ce dossier (`Dockerfile`, `fly.toml`, `render.yaml`).
Sur un hébergeur, montez un volume sur `/data` (variable `DB_PATH=/data/db.json`)
pour conserver les données, et définissez `API_TOKEN`.

## Sécuriser (recommandé sur Internet)

Définissez la variable `API_TOKEN` (ex. `openssl rand -hex 16`). L'API exige alors
`Authorization: Bearer <token>` (et `?token=<token>` sur le WebSocket).
Renseignez la même valeur dans le champ **Clé d'API** de l'app.

## Endpoints

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/health` | État du service (public) |
| GET | `/roles` | Catalogue des rôles |
| GET | `/directory` | Annuaire `{ employees: [...] }` |
| POST | `/directory/employees` | Créer/mettre à jour un employé (+ diffusion WS) |
| DELETE | `/directory/employees/:id` | Supprimer (+ diffusion WS) |
| POST | `/admin/set-role` | `{ id, role, admin }` (+ diffusion WS) |
| GET / POST | `/vehicles` | Lister / créer-màj un véhicule |
| DELETE | `/vehicles/:key` | Supprimer (pagilog_id ou immatriculation) |
| GET / POST | `/interventions` | Lister / recevoir des fiches |
| WS | `/ws` | Annuaire à la connexion + à chaque changement |

Rôles : `chauffeur`, `mecanicien`, `gestionnaire`, `exploitant`, `admin`.

## Migrer vers le vrai PAGILOG plus tard

Ce backend respecte le même contrat que l'app. Le jour où PAGILOG expose son API,
soit vous pointez l'app dessus, soit ce serveur fait le pont — dans les deux cas
seul `app/src/services/directorySync.ts` (et `pagilog.ts` pour le parc) est à
aligner sur le schéma réel.

> `../mock-pagilog` reste un mini double **en mémoire** pour des tests rapides ;
> `server/` est le backend **persistant** destiné à un usage réel.
