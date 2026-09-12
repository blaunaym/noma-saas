'use client'

import { SessionDrinkAddon, SessionWithDetails } from '@/types'
import { formatTime } from '@/lib/utils'
import { CheckCircle, Coffee, Cookie, MapPin } from 'lucide-react'
import { useTransition } from 'react'
import { serveDrink, serveExtra } from '@/app/actions/sessions'

export interface BarQueueEntry {
  id: string
  kind: 'drink' | 'extra'
  name: string
  quantity: number
  addons?: SessionDrinkAddon[]
  added_at: string
  session: SessionWithDetails
}

interface BarQueueProps {
  items: BarQueueEntry[]
  onRefresh: () => void
}

export default function BarQueue({ items, onRefresh }: BarQueueProps) {
  const [isPending, startTransition] = useTransition()

  function handleServe(entry: BarQueueEntry) {
    startTransition(async () => {
      if (entry.kind === 'extra') await serveExtra(entry.id)
      else await serveDrink(entry.id)
      onRefresh()
    })
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
        <Coffee size={32} className="text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Aucune commande en attente</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map(entry => {
        const { session } = entry
        const Icon = entry.kind === 'extra' ? Cookie : Coffee
        return (
          <div
            key={entry.id}
            className="bg-white rounded-2xl border border-amber-100 px-4 py-3 flex items-center gap-4 shadow-sm animate-slide-in"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm">
                  {entry.quantity > 1 && `${entry.quantity}× `}{entry.name}
                </p>
                {session.zone_name && (
                  <span className="shrink-0 flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200">
                    <MapPin size={10} />
                    {session.zone_name}
                  </span>
                )}
              </div>
              {entry.addons && entry.addons.length > 0 && (
                <p className="text-xs text-noma-600 font-medium mt-0.5">
                  + {entry.addons.map(a => a.addon_name).join(', ')}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                {session.first_name} {session.last_name ?? ''} · {formatTime(entry.added_at)}
              </p>
            </div>
            <button
              onClick={() => handleServe(entry)}
              disabled={isPending}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-all active:scale-95"
            >
              <CheckCircle size={15} />
              Servi
            </button>
          </div>
        )
      })}
    </div>
  )
}
