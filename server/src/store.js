const fs = require('fs');
const path = require('path');
const seed = require('./seed');

/**
 * Magasin persistant simple, sans base de données : les données vivent dans un
 * unique fichier JSON écrit de façon atomique (fichier temporaire + rename).
 * Suffisant pour une flotte d'entreprise sur une instance. Pour du multi-
 * instances, remplacer par une base (Postgres/SQLite) — l'interface ne change pas.
 */
class Store {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = { employees: [], vehicles: [], interventions: [], updatedAt: 0 };
    this._timer = null;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        // Première initialisation : on sème les données d'exemple.
        this.data = {
          employees: seed.employees.map((e) => ({ ...e })),
          vehicles: seed.vehicles.map((v) => ({ ...v })),
          interventions: [],
          updatedAt: Date.now(),
        };
        this._writeNow();
      }
    } catch (e) {
      // Fichier corrompu : on repart d'une base vide plutôt que de planter.
      console.error('Store: lecture impossible, réinitialisation.', e.message);
      this.data = { employees: [], vehicles: [], interventions: [], updatedAt: Date.now() };
    }
    // ids manquants → on en génère (stabilité des références).
    for (const e of this.data.employees) if (!e.id) e.id = 'e' + Math.random().toString(36).slice(2, 9);
  }

  /** Écrit immédiatement, de façon atomique. */
  _writeNow() {
    const dir = path.dirname(this.dbPath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.dbPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.dbPath);
  }

  /** Marque modifié + planifie une écriture (coalescée sur 200 ms). */
  _persist() {
    this.data.updatedAt = Date.now();
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      try {
        this._writeNow();
      } catch (e) {
        console.error('Store: écriture échouée', e.message);
      }
    }, 200);
  }

  /** Vide le tampon d'écriture (à appeler à l'arrêt du process). */
  flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    try {
      this._writeNow();
    } catch (e) {
      console.error('Store: flush échoué', e.message);
    }
  }

  // --- Employés / annuaire ---
  getEmployees() {
    return this.data.employees;
  }

  upsertEmployee(emp) {
    if (!emp.id) emp.id = 'e' + Math.random().toString(36).slice(2, 9);
    const i = this.data.employees.findIndex((e) => String(e.id) === String(emp.id));
    if (i >= 0) this.data.employees[i] = { ...this.data.employees[i], ...emp };
    else this.data.employees.push(emp);
    this._persist();
    return emp;
  }

  removeEmployee(id) {
    const before = this.data.employees.length;
    this.data.employees = this.data.employees.filter((e) => String(e.id) !== String(id));
    const removed = this.data.employees.length !== before;
    if (removed) this._persist();
    return removed;
  }

  setRole(id, role, admin) {
    const e = this.data.employees.find((x) => String(x.id) === String(id));
    if (!e) return null;
    if (role !== undefined) {
      e.role = role;
      delete e.permissions;
    }
    if (admin !== undefined) e.admin = admin;
    this._persist();
    return e;
  }

  // --- Véhicules ---
  getVehicles() {
    return this.data.vehicles;
  }

  upsertVehicle(v) {
    const key = v.pagilog_id || v.immatriculation;
    const i = this.data.vehicles.findIndex(
      (x) => (x.pagilog_id || x.immatriculation) === key
    );
    if (i >= 0) this.data.vehicles[i] = { ...this.data.vehicles[i], ...v };
    else this.data.vehicles.push(v);
    this._persist();
    return v;
  }

  removeVehicle(key) {
    const before = this.data.vehicles.length;
    this.data.vehicles = this.data.vehicles.filter(
      (x) => (x.pagilog_id || x.immatriculation) !== key
    );
    const removed = this.data.vehicles.length !== before;
    if (removed) this._persist();
    return removed;
  }

  // --- Interventions ---
  getInterventions() {
    return this.data.interventions;
  }

  addInterventions(list) {
    const arr = Array.isArray(list) ? list : [];
    this.data.interventions.push(...arr);
    this._persist();
    return arr.length;
  }
}

module.exports = { Store };
