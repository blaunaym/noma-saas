'use server'

import { revalidatePath } from 'next/cache'
import { AddDrinkInput, AddExtraInput, CreateSessionInput } from '@/types'
import {
  db_createSession, db_stopSession, db_cancelSession, db_updateSession,
  db_addDrink, db_addExtra, db_serveDrink, db_serveExtra, db_deleteDrink, db_replaceDrink,
  db_getSessionsForDate, db_getSessionsForRange,
  db_getKPIForDate, db_getCatalog, db_getFullCatalog, db_getStats,
} from '@/lib/db'

export async function createSession(input: CreateSessionInput) {
  try {
    await db_createSession({
      first_name:     input.first_name,
      last_name:      input.last_name      ?? null,
      zone_name:      input.zone_name      ?? null,
      notes:          input.notes          ?? null,
      is_day_pass:    input.is_day_pass    ?? false,
      day_pass_price: input.day_pass_price ?? null,
    })
    revalidatePath('/')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function stopSession(sessionId: string) {
  try {
    const result = await db_stopSession(sessionId)
    if (result.error) return { error: result.error }
    revalidatePath('/')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function cancelSession(sessionId: string) {
  try {
    const result = await db_cancelSession(sessionId)
    if (result.error) return { error: result.error }
    revalidatePath('/')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateSession(
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
) {
  try {
    const result = await db_updateSession(sessionId, data)
    if (result.error) return { error: result.error }
    revalidatePath('/')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function addDrinkToSession(input: AddDrinkInput) {
  try {
    const result = await db_addDrink({
      session_id: input.session_id,
      drink_id:   input.drink_id,
      drink_name: input.drink_name,
      quantity:   input.quantity  ?? 1,
      addon_ids:  input.addon_ids ?? [],
    })
    if (result.error) return { error: result.error }
    revalidatePath('/')
    revalidatePath('/bar')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function addExtraToSession(input: AddExtraInput) {
  try {
    const result = await db_addExtra({
      session_id: input.session_id,
      extra_id:   input.extra_id,
      extra_name: input.extra_name,
      quantity:   input.quantity ?? 1,
    })
    if (result.error) return { error: result.error }
    revalidatePath('/')
    revalidatePath('/bar')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function serveExtra(extraId: string) {
  try {
    const result = await db_serveExtra(extraId)
    if (result.error) return { error: result.error }
    revalidatePath('/bar')
    revalidatePath('/')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function serveDrink(drinkId: string) {
  try {
    const result = await db_serveDrink(drinkId)
    if (result.error) return { error: result.error }
    revalidatePath('/bar')
    revalidatePath('/')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function deleteDrink(drinkId: string) {
  try {
    const result = await db_deleteDrink(drinkId)
    if (result.error) return { error: result.error }
    revalidatePath('/')
    revalidatePath('/bar')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function replaceDrink(input: {
  old_drink_id: string
  session_id: string
  drink_id: string
  drink_name: string
  quantity: number
  addon_ids: string[]
}) {
  try {
    const result = await db_replaceDrink(input)
    if (result.error) return { error: result.error }
    revalidatePath('/')
    revalidatePath('/bar')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function getSessionsForDate(date: string) {
  try {
    return { data: await db_getSessionsForDate(date), error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Erreur' }
  }
}

export async function getSessionsForRange(startDate: string, endDate: string) {
  try {
    return { data: await db_getSessionsForRange(startDate, endDate), error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Erreur' }
  }
}

export async function getKPIForDate(date: string) {
  try {
    return await db_getKPIForDate(date)
  } catch {
    return null
  }
}

export async function getCatalog() {
  try {
    return await db_getCatalog()
  } catch {
    return { drinks: [], extras: [], addons: [] }
  }
}

export async function getFullCatalog() {
  try {
    return await db_getFullCatalog()
  } catch {
    return { drinks: [], extras: [], addons: [] }
  }
}

export async function getStats() {
  try {
    return await db_getStats()
  } catch (e) {
    console.error('[getStats]', e)
    return null
  }
}
