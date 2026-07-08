# 🚚 Suivi des Réparations — Flotte de 15 Camions

Application web pour répertorier une flotte de **15 camions** et suivre :
- 🔧 les **réparations à prévoir** (avec priorité : haute / moyenne / basse),
- ✅ les **réparations déjà effectuées**.

## Utilisation

Ouvrez simplement `index.html` dans un navigateur — aucune installation, aucun serveur requis.

L'application démarre avec 15 camions pré-remplis. Les données sont **enregistrées localement** dans le navigateur (localStorage).

## Fonctionnalités

- **Vue d'ensemble** : nombre de camions, réparations urgentes, à prévoir et effectuées.
- **Fiche par camion** : nom/modèle, plaque, kilométrage, année.
- **Gestion des réparations** : ajout, cochage (fait / à faire), suppression, priorité et date.
- **Statut automatique** de chaque camion : ⚠ Urgent, 🔧 À prévoir, ✅ À jour.
- **Recherche** (nom, plaque, réparation) et **tri** (n°, nom, réparations en attente).
- **Ajout / modification / suppression** de camions.
- **Import / Export JSON** pour sauvegarder ou partager la flotte.
- **Réinitialisation** vers les 15 camions par défaut.

## Fichiers

- `index.html` — l'application complète (autonome, un seul fichier).
