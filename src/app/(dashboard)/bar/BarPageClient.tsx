'use client'

import { useState, useCallback, useTransition } from 'react'
import { SessionWithDetails } from '@/types'
import Header from '@/components/layout/Header'
import BarQueue, { BarQueueEntry } from '@/components/bar/BarQueue'
import { Coffee, CheckCircle, RefreshCw, Timer } from 'lucide-react'
import { getSessionsForDate } from '@/app/actions/sessions'
import { todayISO, formatTime } from '@/lib/utils'

interface Props {
  initialSessions: SessionWithDetails[]
}

export default function BarPageClient({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<SessionWithDetails[]>(initialSessions)
  const [isRefreshing, startRefresh] = useTransition()

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const { data } = await getSessionsForDate(todayISO())
      setSessions(data as SessionWithDetails[])
    })
  }, [])

  const activeSessions = sessions.filter(s => s.status === 'active')

  interface QueueEntry extends BarQueueEntry {
    bar_status: 'preparing' | 'served'
    served_at: string | null
  }

  const drinkEntries: QueueEntry[] = activeSessions.flatMap(session =>
    session.session_drinks.map(d => ({
      id: d.id, kind: 'drink' as const, name: d.drink_name, quantity: d.quantity,
      addons: d.addons, added_at: d.added_at, session,
      bar_status: d.bar_status, served_at: d.served_at,
    }))
  )

  const extraEntries: QueueEntry[] = activeSessions.flatMap(session =>
    session.session_extras.map(e => ({
      id: e.id, kind: 'extra' as const, name: e.extra_name, quantity: e.quantity,
      addons: undefined, added_at: e.added_at, session,
      bar_status: e.bar_status, served_at: e.served_at,
    }))
  )

  const allEntries = [...drinkEntries, ...extraEntries]
  const preparingItems = allEntries.filter(e => e.bar_status === 'preparing')
  const servedItems = allEntries.filter(e => e.bar_status === 'served')

  return (
    <>
      <Header
        title="File bar"
        subtitle="Commandes en attente de préparation"
        actions={
          <button
            onClick={refresh}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-2 gap-8 items-start">
          {/* En préparation */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Coffee size={20} className="text-amber-500" />
              <h2 className="font-bold text-slate-900 text-lg">En préparation</h2>
              {preparingItems.length > 0 && (
                <span className="ml-auto text-sm font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  {preparingItems.length}
                </span>
              )}
            </div>
            <BarQueue items={preparingItems} onRefresh={refresh} />
          </div>

          {/* Servis récemment */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={20} className="text-green-500" />
              <h2 className="font-bold text-slate-900 text-lg">Servis aujourd&apos;hui</h2>
              <span className="ml-auto text-sm font-medium text-slate-400">
                {servedItems.length}
              </span>
            </div>
            <div className="space-y-2">
              {servedItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-sm text-slate-400">
                  Aucune commande servie
                </div>
              ) : (
                servedItems.map(entry => {
                  const { session } = entry
                  const prepMins = entry.served_at
                    ? Math.round((new Date(entry.served_at).getTime() - new Date(entry.added_at).getTime()) / 60000)
                    : null
                  return (
                    <div
                      key={entry.id}
                      className="bg-white rounded-2xl border border-green-100 px-4 py-3 flex items-center gap-4 opacity-70"
                    >
                      <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle size={16} className="text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {entry.quantity > 1 && `${entry.quantity}× `}{entry.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {session.first_name}
                          {session.zone_name && <span className="ml-1 font-medium">· {session.zone_name}</span>}
                          {entry.served_at && <span> · servi à {formatTime(entry.served_at)}</span>}
                        </p>
                      </div>
                      {prepMins !== null && prepMins >= 0 && (
                        <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                          <Timer size={11} />
                          {prepMins} min
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
