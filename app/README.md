# Tournée Optimizer & Entretien du parc — Android & iPhone

Application mobile pour **transporteurs** réunissant deux modules :

1. **Tournée** — capture d'adresses par la caméra, optimisation de tournée évitant
   les **ponts trop bas**, et **guidage vocal GPS** précis.
2. **Entretien du parc** — suivi des véhicules et des échéances d'entretien,
   **fiche papier imprimable** pour le mécanicien, **lecture automatique (OCR)** de
   la fiche remplie, et **intégration PAGILOG** (API REST + export/import CSV).

Un seul code (Expo / React Native) tourne sur **Android et iPhone**.

## Module Entretien du parc

| Demande | Réalisation |
|---|---|
| 🔧 Entretien du parc en lien avec PAGILOG | `services/pagilog.ts` : mapping canonique, export/import **CSV** (`;`, UTF-8) et adaptateur **REST** configurable (`PagilogSyncScreen`) |
| 📱 Application téléphone | Écrans `Fleet`, `VehicleDetail`, `InterventionForm` : parc, échéances (km + date), historique, saisie d'intervention |
| 📄 Format papier pour le mécanicien | `services/paperForm.ts` → fiche HTML imprimable (`expo-print`) avec ancres lisibles machine |
| 🤖 Lecture automatique de ce qu'il remplit | `services/maintenanceOcr.ts` : OCR de la fiche → `parseMaintenanceSheet` → association **automatique** au véhicule via le code d'en-tête, cases cochées, km, date, pièces, coût |

### Flux « papier → numérique »

1. Depuis un véhicule : **Imprimer fiche papier** (chaque fiche porte un code
   `FE:<véhicule>:<fiche>`).
2. Le mécanicien remplit à la main : coche les cases, écrit le km, la date, etc.
3. **Scanner fiche** : l'app lit la photo, reconnaît le véhicule via le code,
   pré-remplit la fiche numérique. On vérifie, on enregistre.
4. **Synchronisation PAGILOG** : envoi REST des fiches, ou export/import CSV.

> **PAGILOG** : le format d'échange exact n'étant pas public, l'intégration est
> isolée dans `services/pagilog.ts`. L'export/import CSV fonctionne immédiatement ;
> l'API REST s'active dans l'écran PAGILOG dès que l'URL et la clé sont fournies
> (un seul fichier à ajuster pour coller au contrat réel).

## Module Tournée

| Demande | Réalisation |
|---|---|
| 📷 Adresse prise via la caméra | `CaptureScreen` → OCR (`services/ocr.ts`) → extraction de l'adresse → géocodage |
| 🧭 Optimisation pour gagner du temps | `services/optimizer.ts` : matrice OSRM + plus proche voisin + amélioration **2-opt** |
| 🌉 Paramétrage de hauteur de pont | Profil véhicule (`SettingsScreen`) + base de ponts (`data/bridges.ts`) + détection sur le tracé (`services/bridges.ts`) + ajout de ponts à la volée |
| 🔊 Guidage vocal type GPS précis | `NavigationScreen` : GPS `BestForNavigation` + `services/navEngine.ts` + synthèse vocale FR (`services/voice.ts`), alertes ponts bas |

## Architecture

```
app/
├─ App.tsx                      Point d'entrée + hydratation du store
├─ src/
│  ├─ screens/                  Tournée : Home · Capture · Stops · Route · Navigation · Settings
│  │                            Entretien : Fleet · VehicleDetail · InterventionForm · PaperScan · PagilogSync
│  ├─ services/
│  │  ├─ ocr.ts                 Photo → texte → adresse (OCR.space, remplaçable par ML Kit)
│  │  ├─ geocoding.ts           Adresse → coordonnées (Nominatim/OSM)
│  │  ├─ routing.ts             Matrice + itinéraire pas-à-pas (OSRM)
│  │  ├─ optimizer.ts           TSP : plus proche voisin + 2-opt
│  │  ├─ bridges.ts             Détection des ponts trop bas sur le tracé
│  │  ├─ navEngine.ts           Logique de guidage (étape courante, alertes pont)
│  │  ├─ voice.ts               Synthèse vocale française (expo-speech)
│  │  ├─ location.ts            GPS haute précision (expo-location)
│  │  ├─ maintenanceSchedule.ts Échéances d'entretien (km + date)
│  │  ├─ paperForm.ts           Fiche papier imprimable (HTML/PDF)
│  │  ├─ maintenanceOcr.ts      Lecture automatique de la fiche remplie
│  │  └─ pagilog.ts             Intégration PAGILOG (CSV + REST)
│  ├─ store/
│  │  ├─ useTourStore.ts        État tournée (zustand) + persistance
│  │  └─ useFleetStore.ts       État parc/entretien (zustand) + persistance
│  ├─ data/
│  │  ├─ bridges.ts             Base locale de ponts bas (enrichissable)
│  │  └─ maintenancePlans.ts    Catalogue d'opérations + périodicités
│  └─ utils/                    geo.ts (haversine, polyline…) · date.ts
└─ src/__tests__/               Tests unitaires de la logique pure
```

## Démarrer

```bash
cd app
npm install
npm start          # puis 'a' (Android) ou 'i' (iOS), ou scanner le QR avec Expo Go
```

Builds installables (sans Mac pour iOS) via EAS :

```bash
npm install -g eas-cli
eas build -p android --profile preview
eas build -p ios --profile preview
```

## Tests

```bash
cd app
npm test           # Jest : optimiseur, ponts, géo, OCR, moteur de guidage
```

La logique métier (optimisation, détection de ponts, décodage de tracé, guidage,
parsing OCR) est couverte par des tests purs, sans dépendance réseau.

## Services & clés

Par défaut, **100 % open-source et sans clé** :

- Cartes/géocodage : **OpenStreetMap / Nominatim**
- Itinéraires : **OSRM** (`router.project-osrm.org`)
- OCR : **OCR.space** (clé de démo `helloworld`, à remplacer par une clé gratuite)
- Voix : synthèse vocale native de l'appareil

> Les serveurs de démo OSRM/Nominatim sont à usage léger. Pour la production,
> hébergez vos instances ou branchez Google/Mapbox aux points d'extension
> signalés dans `services/` (un seul fichier à modifier par service).

## Précision du guidage

- GPS en mode `Accuracy.BestForNavigation`, rafraîchi chaque seconde / 5 m.
- La caméra suit le cap (`heading`) et la vitesse réels pour un rendu type GPS.
- Annonce vocale anticipée à 150 m de chaque manœuvre (anti-répétition).
- Alerte vocale prioritaire à 400 m d'un pont plus bas que le véhicule + marge.

## Pistes d'évolution

- OCR hors-ligne via ML Kit (dev build) pour scanner sans réseau.
- Évitement *routé* des ponts (recalcul d'itinéraire OSRM excluant les voies),
  en plus de l'alerte actuelle.
- Fenêtres horaires de livraison et contraintes de tonnage.
- Import massif de ponts depuis un export OpenStreetMap (`maxheight`).
