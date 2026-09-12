/**
 * Proxy DB — bascule automatique entre mode local (JSON) et Supabase
 *
 * Règle de sélection :
 *   USE_LOCAL_DB=true OU NEXT_PUBLIC_SUPABASE_URL absent → JSON local (data/db.json)
 *   Sinon → Supabase (nécessite SUPABASE_SERVICE_ROLE_KEY)
 *
 * Ce module est uniquement importé depuis des Server Actions → pas de bundle client.
 */

// Importation des deux implémentations côté serveur uniquement
// eslint-disable-next-line @typescript-eslint/no-require-imports
const impl: typeof import('./localDb') =
  process.env.USE_LOCAL_DB === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL
    ? require('./localDb')
    : require('./supabaseDb')

export const db_createSession    = impl.db_createSession
export const db_stopSession      = impl.db_stopSession
export const db_cancelSession    = impl.db_cancelSession
export const db_updateSession    = impl.db_updateSession
export const db_addDrink         = impl.db_addDrink
export const db_addExtra         = impl.db_addExtra
export const db_serveDrink       = impl.db_serveDrink
export const db_serveExtra       = impl.db_serveExtra
export const db_deleteDrink      = impl.db_deleteDrink
export const db_replaceDrink     = impl.db_replaceDrink
export const db_deleteExtra      = impl.db_deleteExtra
export const db_replaceExtra     = impl.db_replaceExtra
export const db_getSessionsForDate  = impl.db_getSessionsForDate
export const db_getSessionsForRange = impl.db_getSessionsForRange
export const db_getKPIForDate    = impl.db_getKPIForDate
export const db_getCatalog       = impl.db_getCatalog
export const db_getFullCatalog   = impl.db_getFullCatalog
export const db_getStats         = impl.db_getStats
