import { Employee, PermissionKey } from '@/types';
import { PERMISSION_CATALOG } from '@/data/permissions';
import { roleById } from '@/data/roles';
import { permissionsFromKeys } from './auth';
import { PagilogConfig } from './pagilog';

/**
 * Synchronisation centralisée des employés et de leurs droits depuis PAGILOG.
 *
 * - Les profils gérés par PAGILOG sont marqués `managed: true` (lecture seule
 *   dans l'app ; toute modification se fait côté PAGILOG).
 * - Temps réel : WebSocket si `wsUrl` est fourni, sinon interrogation périodique
 *   (`pollSeconds`). L'app applique chaque mise à jour reçue immédiatement.
 *
 * Le schéma exact de PAGILOG n'étant pas public, les mappers ci-dessous sont
 * tolérants (alias de champs) et constituent le seul point à ajuster.
 */

const KNOWN_KEYS = new Set<string>(PERMISSION_CATALOG.map((p) => p.key));

function parsePermissions(raw: unknown): PermissionKey[] {
  let list: string[] = [];
  if (Array.isArray(raw)) list = raw.map(String);
  else if (typeof raw === 'string') list = raw.split(/[;,|]/).map((s) => s.trim());
  else if (raw && typeof raw === 'object') {
    list = Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true || v === 'true' || v === 1)
      .map(([k]) => k);
  }
  return list.filter((k): k is PermissionKey => KNOWN_KEYS.has(k));
}

/** Convertit un enregistrement annuaire PAGILOG en Employee local (géré). */
export function remoteToEmployee(r: Record<string, any>, now: number): Employee | null {
  const pagilogId = String(r.id ?? r.pagilog_id ?? r.matricule ?? '').trim();
  const name = String(r.name ?? r.nom ?? r.fullname ?? '').trim();
  if (!pagilogId && !name) return null;

  const roleId = r.role ?? r.role_id ?? r.roleId;
  const role = roleById(typeof roleId === 'string' ? roleId : undefined);
  const isAdmin =
    r.admin === true ||
    r.is_admin === true ||
    r.isAdmin === true ||
    role?.isAdmin === true ||
    roleId === 'admin';

  // Priorité : permissions explicites, sinon celles du rôle.
  const explicit = parsePermissions(r.permissions);
  const keys = explicit.length > 0 ? explicit : role ? role.permissions : [];

  const pin = typeof r.pin === 'string' && /^\d{4}$/.test(r.pin) ? r.pin : undefined;

  return {
    id: pagilogId ? `pag_${pagilogId}` : `pag_${name.replace(/\s+/g, '_')}`,
    name: name || pagilogId,
    isAdmin,
    permissions: isAdmin ? {} : permissionsFromKeys(keys),
    roleId: role?.id,
    managed: true,
    pagilogId: pagilogId || undefined,
    pin,
    createdAt: now,
  };
}

export function mapDirectory(payload: any, now: number): Employee[] {
  const arr: any[] = Array.isArray(payload)
    ? payload
    : payload?.employees ?? payload?.directory ?? [];
  return arr
    .map((r, i) => remoteToEmployee(r, now + i))
    .filter((e): e is Employee => e !== null);
}

/** Représentation d'un employé pour un envoi (push) vers PAGILOG. */
export function employeeToRemote(e: Employee): Record<string, any> {
  return {
    id: e.pagilogId ?? e.id,
    name: e.name,
    role: e.roleId,
    admin: e.isAdmin,
    permissions: Object.entries(e.permissions)
      .filter(([, v]) => v === true)
      .map(([k]) => k),
  };
}

function authHeaders(config: PagilogConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiKey}` };
}

/** Récupère l'annuaire (employés + droits) depuis PAGILOG. */
export async function fetchDirectory(config: PagilogConfig, now: number): Promise<Employee[]> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/directory`, {
    headers: authHeaders(config),
  });
  if (!res.ok) throw new Error(`PAGILOG annuaire a répondu ${res.status}`);
  return mapDirectory(await res.json(), now);
}

/** Pousse un employé (créé/modifié localement) vers PAGILOG. */
export async function pushEmployee(config: PagilogConfig, e: Employee): Promise<void> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/directory/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify(employeeToRemote(e)),
  });
  if (!res.ok) throw new Error(`PAGILOG a répondu ${res.status}`);
}

export type DirectoryStatus = 'off' | 'connecting' | 'live' | 'polling' | 'error';

export interface LiveSyncHandle {
  stop: () => void;
}

/**
 * Démarre la synchro temps réel. WebSocket si `wsUrl`, sinon polling.
 * `onEmployees` reçoit la liste d'employés gérés à chaque mise à jour.
 * `nowFn` fournit l'horodatage (injecté pour rester testable).
 */
export function startDirectorySync(
  config: PagilogConfig,
  onEmployees: (employees: Employee[]) => void,
  onStatus: (status: DirectoryStatus, error?: string) => void,
  nowFn: () => number = () => Date.now()
): LiveSyncHandle {
  let stopped = false;

  // --- WebSocket (temps réel push) ---
  if (config.wsUrl) {
    onStatus('connecting');
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(config.wsUrl);
      ws.onopen = () => !stopped && onStatus('live');
      ws.onmessage = (ev) => {
        if (stopped) return;
        try {
          onEmployees(mapDirectory(JSON.parse(String(ev.data)), nowFn()));
        } catch (e: any) {
          onStatus('error', e?.message ?? 'message illisible');
        }
      };
      ws.onerror = () => !stopped && onStatus('error', 'erreur WebSocket');
      ws.onclose = () => !stopped && onStatus('off');
    } catch (e: any) {
      onStatus('error', e?.message ?? String(e));
    }
    return {
      stop: () => {
        stopped = true;
        ws?.close();
      },
    };
  }

  // --- Polling (rafraîchissement périodique) ---
  const periodMs = Math.max(5, config.pollSeconds ?? 30) * 1000;
  onStatus('polling');
  const tick = async () => {
    if (stopped) return;
    try {
      const employees = await fetchDirectory(config, nowFn());
      if (!stopped) {
        onEmployees(employees);
        onStatus('polling');
      }
    } catch (e: any) {
      if (!stopped) onStatus('error', e?.message ?? String(e));
    }
  };
  tick();
  const timer = setInterval(tick, periodMs);
  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
