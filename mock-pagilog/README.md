# Mock PAGILOG — serveur d'exemple (REST + WebSocket temps réel)

Petit serveur qui **imite PAGILOG** pour tester la **synchronisation centralisée
des employés et de leurs droits** de l'application, y compris le **temps réel**.

Il ne sert qu'aux tests : dès que le contrat réel de PAGILOG est connu, on
branche l'app dessus (voir `app/src/services/directorySync.ts`).

## Installation (sur le PC)

Prérequis : **Node.js 18+** (idéalement 20/22).

```bash
cd mock-pagilog
npm install        # installe la seule dépendance : ws
```

## Démarrer

```bash
npm start          # écoute sur http://localhost:8787 et ws://localhost:8787/ws
```

Options par variables d'environnement :

| Variable   | Défaut    | Rôle |
|------------|-----------|------|
| `PORT`     | `8787`    | Port d'écoute |
| `HOST`     | `0.0.0.0` | Interface (0.0.0.0 = accessible depuis le téléphone du réseau local) |
| `API_TOKEN`| *(vide)*  | Si défini, exige `Authorization: Bearer <token>` (et `?token=` sur le WS) |

## Tester

```bash
npm test           # test de contrat : REST + WS + diffusion temps réel
npm run demo       # modifie des rôles toutes les 4 s (à lancer à côté de `npm start`)
```

## Endpoints

| Méthode | Chemin                  | Rôle |
|---------|-------------------------|------|
| GET     | `/directory`            | Annuaire : `{ employees: [...] }` |
| POST    | `/directory/employees`  | Upsert d'un employé puis diffusion WS |
| POST    | `/admin/set-role`       | `{ id, role }` : change un rôle, diffusion WS |
| GET     | `/vehicles`             | Parc (pour l'import/`pullVehicles`) |
| POST    | `/interventions`        | Réception des fiches (pour `pushInterventions`) |
| WS      | `/ws`                   | Pousse l'annuaire à la connexion et à chaque changement |

Format d'un employé (volontairement varié pour exercer les mappers tolérants) :

```json
{ "id": "1002", "name": "Paul Mécano", "role": "mecanicien" }
{ "id": "1005", "name": "Karim", "permissions": ["tour.capture", "fleet.view"] }
{ "id": "1004", "name": "Léa", "admin": true }
```

Rôles reconnus : `chauffeur`, `mecanicien`, `gestionnaire`, `exploitant`, `admin`.

## Brancher l'application

Dans l'app, écran **PAGILOG** → *Gestion centralisée des employés* :

1. **URL de l'API** : `http://<IP-du-PC>:8787` (pas `localhost` depuis un téléphone —
   mettez l'IP locale du PC, ex. `http://192.168.1.20:8787`).
2. **URL WebSocket** : `ws://<IP-du-PC>:8787/ws` (temps réel instantané).
3. Activez **« Gérer les employés depuis PAGILOG »** et enregistrez.

Les 5 employés d'exemple apparaissent alors dans *Employés & accès* (badge
« PAGILOG »). Lancez `npm run demo` et regardez leurs droits changer en direct.

> Le PC et le téléphone doivent être sur le **même réseau Wi‑Fi**, et le
> pare-feu doit autoriser le port `8787`.
