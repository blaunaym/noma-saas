export type SessionStatus = 'active' | 'finished' | 'cancelled'
export type BarStatus = 'preparing' | 'served'
export type DrinkCategory = 'hot' | 'cold' | 'other'

export interface Zone {
  id: string
  name: string
  capacity: number
  is_active: boolean
  created_at: string
}

export interface DrinkCatalog {
  id: string
  name: string
  category: DrinkCategory
  description?: string | null
  price: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ExtraCatalog {
  id: string
  name: string
  category?: string | null
  price: number | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface DrinkAddon {
  id: string
  name: string
  price: number | null
  is_active: boolean
  created_at: string
}

export interface SessionDrinkAddon {
  id: string
  session_drink_id: string
  addon_id: string
  addon_name: string
  price_snapshot: number | null
  created_at: string
}

export interface SessionDrink {
  id: string
  session_id: string
  drink_id: string
  drink_name: string
  quantity: number
  bar_status: BarStatus
  added_at: string
  served_at: string | null
  line_total: number | null
  addons?: SessionDrinkAddon[]
}

export interface SessionExtra {
  id: string
  session_id: string
  extra_id: string
  extra_name: string
  quantity: number
  bar_status: BarStatus
  added_at: string
  served_at: string | null
}

export interface Session {
  id: string
  date: string
  first_name: string
  last_name: string | null
  zone_id: string | null
  zone_name: string | null
  arrival_time: string
  departure_time: string | null
  duration_minutes: number | null
  status: SessionStatus
  notes: string | null
  is_day_pass: boolean
  day_pass_price: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  session_drinks?: SessionDrink[]
  session_extras?: SessionExtra[]
}

export interface SessionWithDetails extends Session {
  session_drinks: SessionDrink[]
  session_extras: SessionExtra[]
}

export interface KPIData {
  total_sessions: number
  active_sessions: number
  finished_sessions: number
  cancelled_sessions: number
  total_drinks: number
  total_extras: number
}

export interface CreateSessionInput {
  first_name: string
  last_name?: string
  zone_id?: string
  zone_name?: string
  notes?: string
  is_day_pass?: boolean
  day_pass_price?: number | null
}

export interface AddDrinkInput {
  session_id: string
  drink_id: string
  drink_name: string
  quantity?: number
  addon_ids?: string[]
}

export interface AddExtraInput {
  session_id: string
  extra_id: string
  extra_name: string
  quantity?: number
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface DrinkStat {
  drink_name: string
  total: number
}

export interface ExtraStat {
  extra_name: string
  total: number
}

export interface HourStat {
  hour: number
  count: number
}

export interface ZoneStat {
  zone: string
  count: number
}

export interface PrepTimeStat {
  drink_name: string
  avg_minutes: number
  count: number
}

export interface PrepTimeByRank {
  rank: number
  avg_minutes: number
  count: number
}

export interface StatsData {
  top_drinks: DrinkStat[]
  top_extras: ExtraStat[]
  total_sessions: number
  active_sessions: number
  finished_sessions: number
  day_pass_count: number
  avg_duration_minutes: number
  total_drinks: number
  total_extras: number
  sessions_by_hour: HourStat[]
  sessions_by_zone: ZoneStat[]
  avg_prep_time_per_drink: PrepTimeStat[]
  prep_time_by_rank: PrepTimeByRank[]
}
