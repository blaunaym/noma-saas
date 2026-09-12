/**
 * Base de données locale JSON — remplace Supabase pour les tests V1
 * Fichier : data/db.json (à la racine du projet)
 */

import fs from 'fs'
import path from 'path'
import {
  Session, SessionDrink, SessionDrinkAddon, SessionExtra,
  DrinkCatalog, ExtraCatalog, DrinkAddon, StatsData, PrepTimeStat, PrepTimeByRank
} from '@/types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')
// Seed vit hors de data/ : sur Railway, data/ est un volume monté qui masque
// tout fichier déjà présent dans l'image au même chemin (donc pas db.json ici).
const SEED_PATH = path.join(process.cwd(), 'seed', 'db.seed.json')

interface DB {
  sessions:            Session[]
  session_drinks:      SessionDrink[]
  session_drink_addons: SessionDrinkAddon[]
  session_extras:      SessionExtra[]
  drinks_catalog:      DrinkCatalog[]
  extras_catalog:      ExtraCatalog[]
  drink_addons:        DrinkAddon[]
}

function ensureDb(): void {
  if (fs.existsSync(DB_PATH)) return
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const seed = fs.existsSync(SEED_PATH)
    ? fs.readFileSync(SEED_PATH, 'utf-8')
    : JSON.stringify({
        sessions: [], session_drinks: [], session_drink_addons: [],
        session_extras: [], drinks_catalog: [], extras_catalog: [], drink_addons: [],
      })
  fs.writeFileSync(DB_PATH, seed, 'utf-8')
}

function readDb(): DB {
  ensureDb()
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  const data = JSON.parse(raw)
  // Compatibilité ascendante si les nouvelles tables n'existent pas encore
  const db: DB = {
    sessions:             data.sessions ?? [],
    session_drinks:       data.session_drinks ?? [],
    session_drink_addons: data.session_drink_addons ?? [],
    session_extras:       data.session_extras ?? [],
    drinks_catalog:       data.drinks_catalog ?? [],
    extras_catalog:       data.extras_catalog ?? [],
    drink_addons:         data.drink_addons ?? [],
  }
  syncCatalogOnBoot(db)
  return db
}

function writeDb(db: DB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

function newId(): string {
  return crypto.randomUUID()
}

// Met à jour le catalogue (boissons/extras/suppléments) sur un volume déjà
// initialisé, sans jamais toucher aux sessions ni à l'historique existant.
// Idempotent — ne réécrit le fichier que si le catalogue a réellement changé.
let catalogSynced = false

function syncCatalogOnBoot(db: DB): void {
  if (catalogSynced) return
  catalogSynced = true
  const now = new Date().toISOString()
  let changed = false

  const OLD_TEAS = ['Thé Menthe Poivrée', 'Thé Vert Fruité', 'Thé Noir Thaï', 'Thé mangue', 'Thé menthe', 'Thé Fruits rouges', 'Rooibos vanille']
  const beforeDrinks = db.drinks_catalog.length
  db.drinks_catalog = db.drinks_catalog.filter(d => !OLD_TEAS.includes(d.name))
  if (db.drinks_catalog.length !== beforeDrinks) changed = true
  if (!db.drinks_catalog.some(d => d.name === 'Thé')) {
    db.drinks_catalog.push({ id: newId(), name: 'Thé', category: 'hot', price: null, is_active: true, sort_order: 6, created_at: now, description: null })
    changed = true
  }

  const OLD_EXTRAS = ['Coca-Cola', 'Fuze Tea']
  const beforeExtras = db.extras_catalog.length
  db.extras_catalog = db.extras_catalog.filter(e => !OLD_EXTRAS.includes(e.name))
  if (db.extras_catalog.length !== beforeExtras) changed = true
  if (!db.extras_catalog.some(e => e.name === 'Canette')) {
    db.extras_catalog.push({ id: newId(), name: 'Canette', category: 'boisson', price: null, is_active: true, sort_order: 12, created_at: now })
    changed = true
  }
  if (!db.extras_catalog.some(e => e.name === 'Muffins')) {
    db.extras_catalog.push({ id: newId(), name: 'Muffins', category: 'sucre', price: null, is_active: true, sort_order: 7, created_at: now })
    changed = true
  }

  for (const [name, price] of [['Sirop Pistache', 0.5], ['Purée de Mangue', 0.5]] as const) {
    if (!db.drink_addons.some(a => a.name === name)) {
      db.drink_addons.push({ id: newId(), name, price, is_active: true, created_at: now })
      changed = true
    }
  }

  if (changed) writeDb(db)
}

// ─── Sessions ────────────────────────────────────────────────────────────────

function hydrateSession(s: Session, db: DB) {
  return {
    ...s,
    session_drinks: db.session_drinks
      .filter(d => d.session_id === s.id)
      .map(d => ({
        ...d,
        addons: db.session_drink_addons.filter(a => a.session_drink_id === d.id),
      })),
    session_extras: db.session_extras.filter(e => e.session_id === s.id),
  }
}

export function db_getSessionsForDate(date: string): Session[] {
  const db = readDb()
  return db.sessions
    .filter(s => s.date === date)
    .sort((a, b) => new Date(b.arrival_time).getTime() - new Date(a.arrival_time).getTime())
    .map(s => hydrateSession(s, db))
}

export function db_getSessionsForRange(startDate: string, endDate: string): Session[] {
  const db = readDb()
  return db.sessions
    .filter(s => s.date >= startDate && s.date <= endDate)
    .sort((a, b) => new Date(b.arrival_time).getTime() - new Date(a.arrival_time).getTime())
    .map(s => hydrateSession(s, db))
}

export function db_getKPIForDate(date: string) {
  const db = readDb()
  const sessions = db.sessions.filter(s => s.date === date)
  const drinks = db.session_drinks.filter(d => sessions.some(s => s.id === d.session_id))
  const extras = db.session_extras.filter(e => sessions.some(s => s.id === e.session_id))

  return {
    total_sessions:     sessions.length,
    active_sessions:    sessions.filter(s => s.status === 'active').length,
    finished_sessions:  sessions.filter(s => s.status === 'finished').length,
    cancelled_sessions: sessions.filter(s => s.status === 'cancelled').length,
    total_drinks:       drinks.reduce((acc, d) => acc + d.quantity, 0),
    total_extras:       extras.reduce((acc, e) => acc + e.quantity, 0),
  }
}

export function db_createSession(input: {
  first_name:     string
  last_name:      string | null
  zone_name:      string | null
  notes:          string | null
  is_day_pass:    boolean
  day_pass_price: number | null
}): Session {
  const db = readDb()
  const now = new Date().toISOString()
  const session: Session = {
    id:               newId(),
    date:             now.split('T')[0],
    first_name:       input.first_name,
    last_name:        input.last_name,
    zone_id:          null,
    zone_name:        input.zone_name,
    arrival_time:     now,
    departure_time:   null,
    duration_minutes: null,
    status:           'active',
    notes:            input.notes,
    is_day_pass:      input.is_day_pass,
    day_pass_price:   input.day_pass_price,
    created_by:       null,
    created_at:       now,
    updated_at:       now,
  }
  db.sessions.push(session)
  writeDb(db)
  return session
}

export function db_stopSession(sessionId: string): { error?: string } {
  const db = readDb()
  const idx = db.sessions.findIndex(s => s.id === sessionId)
  if (idx === -1) return { error: 'Session introuvable' }

  const session = db.sessions[idx]
  const now = new Date()
  const arrival = new Date(session.arrival_time)
  const durationMinutes = session.is_day_pass
    ? null
    : Math.round((now.getTime() - arrival.getTime()) / 60000)

  db.sessions[idx] = {
    ...session,
    status:           'finished',
    departure_time:   now.toISOString(),
    duration_minutes: durationMinutes,
    updated_at:       now.toISOString(),
  }
  writeDb(db)
  return {}
}

export function db_cancelSession(sessionId: string): { error?: string } {
  const db = readDb()
  const idx = db.sessions.findIndex(s => s.id === sessionId)
  if (idx === -1) return { error: 'Session introuvable' }

  db.sessions[idx] = {
    ...db.sessions[idx],
    status:     'cancelled',
    updated_at: new Date().toISOString(),
  }
  writeDb(db)
  return {}
}

export function db_updateSession(
  sessionId: string,
  data: {
    first_name: string
    last_name: string | null
    zone_name: string | null
    notes: string | null
    arrival_time?: string
    departure_time?: string | null
    duration_minutes?: number | null
  }
): { error?: string } {
  const db = readDb()
  const idx = db.sessions.findIndex(s => s.id === sessionId)
  if (idx === -1) return { error: 'Session introuvable' }

  db.sessions[idx] = { ...db.sessions[idx], ...data, updated_at: new Date().toISOString() }
  writeDb(db)
  return {}
}

// ─── Boissons + Suppléments ───────────────────────────────────────────────────

export function db_addDrink(input: {
  session_id: string
  drink_id:   string
  drink_name: string
  quantity:   number
  addon_ids:  string[]
}): { error?: string } {
  const db = readDb()
  const now = new Date().toISOString()
  const drinkId = newId()

  // Calcul line_total basé sur addons
  const selectedAddons = db.drink_addons.filter(a => input.addon_ids.includes(a.id))
  const addonTotal = selectedAddons.reduce((sum, a) => sum + (a.price ?? 0), 0)

  const drink: SessionDrink = {
    id:         drinkId,
    session_id: input.session_id,
    drink_id:   input.drink_id,
    drink_name: input.drink_name,
    quantity:   input.quantity,
    bar_status: 'preparing',
    added_at:   now,
    served_at:  null,
    line_total: addonTotal > 0 ? addonTotal * input.quantity : null,
  }
  db.session_drinks.push(drink)

  // Enregistrer les suppléments
  for (const addon of selectedAddons) {
    const sa: SessionDrinkAddon = {
      id:               newId(),
      session_drink_id: drinkId,
      addon_id:         addon.id,
      addon_name:       addon.name,
      price_snapshot:   addon.price,
      created_at:       now,
    }
    db.session_drink_addons.push(sa)
  }

  writeDb(db)
  return {}
}

export function db_serveDrink(drinkId: string): { error?: string } {
  const db = readDb()
  const idx = db.session_drinks.findIndex(d => d.id === drinkId)
  if (idx === -1) return { error: 'Boisson introuvable' }

  db.session_drinks[idx] = {
    ...db.session_drinks[idx],
    bar_status: 'served',
    served_at:  new Date().toISOString(),
  }
  writeDb(db)
  return {}
}

export function db_deleteDrink(drinkId: string): { error?: string } {
  const db = readDb()
  const idx = db.session_drinks.findIndex(d => d.id === drinkId)
  if (idx === -1) return { error: 'Boisson introuvable' }
  db.session_drinks.splice(idx, 1)
  db.session_drink_addons = db.session_drink_addons.filter(a => a.session_drink_id !== drinkId)
  writeDb(db)
  return {}
}

export function db_replaceDrink(input: {
  old_drink_id: string
  session_id: string
  drink_id: string
  drink_name: string
  quantity: number
  addon_ids: string[]
}): { error?: string } {
  const db = readDb()
  const oldDrink = db.session_drinks.find(d => d.id === input.old_drink_id)
  const added_at = oldDrink?.added_at ?? new Date().toISOString()

  const oldIdx = db.session_drinks.findIndex(d => d.id === input.old_drink_id)
  if (oldIdx !== -1) {
    db.session_drinks.splice(oldIdx, 1)
    db.session_drink_addons = db.session_drink_addons.filter(a => a.session_drink_id !== input.old_drink_id)
  }

  const selectedAddons = db.drink_addons.filter(a => input.addon_ids.includes(a.id))
  const addonTotal = selectedAddons.reduce((sum, a) => sum + (a.price ?? 0), 0)
  const drinkId = newId()

  const drink: SessionDrink = {
    id:         drinkId,
    session_id: input.session_id,
    drink_id:   input.drink_id,
    drink_name: input.drink_name,
    quantity:   input.quantity,
    bar_status: 'preparing',
    added_at,
    served_at:  null,
    line_total: addonTotal > 0 ? addonTotal * input.quantity : null,
  }
  db.session_drinks.push(drink)

  for (const addon of selectedAddons) {
    db.session_drink_addons.push({
      id:               newId(),
      session_drink_id: drinkId,
      addon_id:         addon.id,
      addon_name:       addon.name,
      price_snapshot:   addon.price,
      created_at:       new Date().toISOString(),
    })
  }
  writeDb(db)
  return {}
}

export function db_getBarQueue(): (SessionDrink & { session_first_name: string })[] {
  const db = readDb()
  const activeSessions = db.sessions.filter(s => s.status === 'active')

  return db.session_drinks
    .filter(d => activeSessions.some(s => s.id === d.session_id))
    .map(d => ({
      ...d,
      addons: db.session_drink_addons.filter(a => a.session_drink_id === d.id),
      session_first_name: db.sessions.find(s => s.id === d.session_id)?.first_name ?? '?',
    }))
    .sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())
}

// ─── Extras ───────────────────────────────────────────────────────────────────

export function db_addExtra(input: {
  session_id: string
  extra_id:   string
  extra_name: string
  quantity:   number
}): { error?: string } {
  const db = readDb()
  const extra: SessionExtra = {
    id:         newId(),
    session_id: input.session_id,
    extra_id:   input.extra_id,
    extra_name: input.extra_name,
    quantity:   input.quantity,
    bar_status: 'preparing',
    added_at:   new Date().toISOString(),
    served_at:  null,
  }
  db.session_extras.push(extra)
  writeDb(db)
  return {}
}

export function db_serveExtra(extraId: string): { error?: string } {
  const db = readDb()
  const idx = db.session_extras.findIndex(e => e.id === extraId)
  if (idx === -1) return { error: 'Extra introuvable' }

  db.session_extras[idx] = {
    ...db.session_extras[idx],
    bar_status: 'served',
    served_at:  new Date().toISOString(),
  }
  writeDb(db)
  return {}
}

export function db_deleteExtra(extraId: string): { error?: string } {
  const db = readDb()
  const idx = db.session_extras.findIndex(e => e.id === extraId)
  if (idx === -1) return { error: 'Extra introuvable' }
  db.session_extras.splice(idx, 1)
  writeDb(db)
  return {}
}

export function db_replaceExtra(input: {
  old_extra_id: string
  session_id: string
  extra_id: string
  extra_name: string
  quantity: number
}): { error?: string } {
  const db = readDb()
  const oldIdx = db.session_extras.findIndex(e => e.id === input.old_extra_id)
  if (oldIdx !== -1) db.session_extras.splice(oldIdx, 1)
  db.session_extras.push({
    id:         newId(),
    session_id: input.session_id,
    extra_id:   input.extra_id,
    extra_name: input.extra_name,
    quantity:   input.quantity,
    bar_status: 'preparing',
    added_at:   new Date().toISOString(),
    served_at:  null,
  })
  writeDb(db)
  return {}
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

export function db_getCatalog() {
  const db = readDb()
  return {
    drinks: db.drinks_catalog.filter(d => d.is_active).sort((a, b) => a.sort_order - b.sort_order),
    extras: db.extras_catalog.filter(e => e.is_active).sort((a, b) => a.sort_order - b.sort_order),
    addons: db.drink_addons.filter(a => a.is_active),
  }
}

export function db_getFullCatalog() {
  const db = readDb()
  return {
    drinks: db.drinks_catalog.sort((a, b) => a.sort_order - b.sort_order),
    extras: db.extras_catalog.sort((a, b) => a.sort_order - b.sort_order),
    addons: db.drink_addons,
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function db_getStats(): StatsData {
  const db = readDb()
  const sessions = db.sessions

  // Top boissons
  const drinkCounts: Record<string, number> = {}
  for (const d of db.session_drinks) {
    drinkCounts[d.drink_name] = (drinkCounts[d.drink_name] ?? 0) + d.quantity
  }
  const top_drinks = Object.entries(drinkCounts)
    .map(([drink_name, total]) => ({ drink_name, total }))
    .sort((a, b) => b.total - a.total)

  // Top extras
  const extraCounts: Record<string, number> = {}
  for (const e of db.session_extras) {
    extraCounts[e.extra_name] = (extraCounts[e.extra_name] ?? 0) + e.quantity
  }
  const top_extras = Object.entries(extraCounts)
    .map(([extra_name, total]) => ({ extra_name, total }))
    .sort((a, b) => b.total - a.total)

  // KPIs globaux
  const finished = sessions.filter(s => s.status === 'finished')
  const durations = finished.filter(s => !s.is_day_pass && s.duration_minutes != null).map(s => s.duration_minutes!)
  const avg_duration_minutes = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  // Sessions par heure
  const hourCounts: Record<number, number> = {}
  for (const s of sessions) {
    const hour = new Date(s.arrival_time).getHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  }
  const sessions_by_hour = Object.entries(hourCounts)
    .map(([h, count]) => ({ hour: Number(h), count }))
    .sort((a, b) => a.hour - b.hour)

  // Sessions par zone
  const zoneCounts: Record<string, number> = {}
  for (const s of sessions) {
    const z = s.zone_name ?? 'Non définie'
    zoneCounts[z] = (zoneCounts[z] ?? 0) + 1
  }
  const sessions_by_zone = Object.entries(zoneCounts)
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count)

  const total_drinks = db.session_drinks.reduce((acc, d) => acc + d.quantity, 0)
  const total_extras = db.session_extras.reduce((acc, e) => acc + e.quantity, 0)

  // Temps de préparation moyen par boisson
  const drinkPrepAcc: Record<string, { total: number; count: number }> = {}
  for (const d of db.session_drinks) {
    if (d.bar_status === 'served' && d.served_at) {
      const mins = Math.round((new Date(d.served_at).getTime() - new Date(d.added_at).getTime()) / 60000)
      if (mins >= 0) {
        if (!drinkPrepAcc[d.drink_name]) drinkPrepAcc[d.drink_name] = { total: 0, count: 0 }
        drinkPrepAcc[d.drink_name].total += mins
        drinkPrepAcc[d.drink_name].count++
      }
    }
  }
  const avg_prep_time_per_drink: PrepTimeStat[] = Object.entries(drinkPrepAcc)
    .map(([drink_name, { total, count }]) => ({ drink_name, avg_minutes: Math.round(total / count), count }))
    .sort((a, b) => b.count - a.count)

  // Temps de préparation par rang
  const drinksBySession: Record<string, SessionDrink[]> = {}
  for (const d of db.session_drinks) {
    if (!drinksBySession[d.session_id]) drinksBySession[d.session_id] = []
    drinksBySession[d.session_id].push(d)
  }
  const rankAcc: Record<number, { total: number; count: number }> = {}
  for (const drinks of Object.values(drinksBySession)) {
    const sorted = [...drinks].sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())
    sorted.forEach((d, i) => {
      if (d.bar_status === 'served' && d.served_at) {
        const rank = i + 1
        const mins = Math.round((new Date(d.served_at).getTime() - new Date(d.added_at).getTime()) / 60000)
        if (mins >= 0) {
          if (!rankAcc[rank]) rankAcc[rank] = { total: 0, count: 0 }
          rankAcc[rank].total += mins
          rankAcc[rank].count++
        }
      }
    })
  }
  const prep_time_by_rank: PrepTimeByRank[] = Object.entries(rankAcc)
    .map(([rank, { total, count }]) => ({ rank: Number(rank), avg_minutes: Math.round(total / count), count }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)

  return {
    top_drinks,
    top_extras,
    total_sessions:      sessions.length,
    active_sessions:     sessions.filter(s => s.status === 'active').length,
    finished_sessions:   finished.length,
    day_pass_count:      sessions.filter(s => s.is_day_pass).length,
    avg_duration_minutes,
    total_drinks,
    total_extras,
    sessions_by_hour,
    sessions_by_zone,
    avg_prep_time_per_drink,
    prep_time_by_rank,
  }
}
