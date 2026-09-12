'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ExtraCatalog, SessionWithDetails } from '@/types'
import { Cookie, Droplets, Sandwich, RefreshCw, ChevronLeft } from 'lucide-react'

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const EXTRA_VARIANTS: Record<string, string[]> = {
  muffins: ['Chocolat', 'Myrtille', 'Spéculos', 'Pomme Cannelle'],
  canette: ['Coca', 'Ice Tea', 'Perrier'],
}

function variantsFor(name: string): string[] | null {
  return EXTRA_VARIANTS[normalize(name)] ?? null
}

interface AddExtraModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  session: SessionWithDetails | null
  extras: ExtraCatalog[]
  replaceExtraId?: string
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; btnClass: string; sectionClass: string }> = {
  boisson: {
    label: '🥤 Boissons',
    icon: Droplets,
    btnClass: 'bg-blue-50 hover:bg-blue-100 hover:border-blue-300 border border-transparent text-blue-800',
    sectionClass: 'bg-blue-50/60 border border-blue-100 rounded-xl p-3',
  },
  sale: {
    label: '🥙 Salé',
    icon: Sandwich,
    btnClass: 'bg-orange-50 hover:bg-orange-100 hover:border-orange-300 border border-transparent text-orange-800',
    sectionClass: 'bg-orange-50/60 border border-orange-100 rounded-xl p-3',
  },
  sucre: {
    label: '🍪 Pâtisseries',
    icon: Cookie,
    btnClass: 'bg-purple-50 hover:bg-purple-100 hover:border-purple-300 border border-transparent text-purple-800',
    sectionClass: 'bg-purple-50/60 border border-purple-100 rounded-xl p-3',
  },
}

const CATEGORY_ORDER = ['boisson', 'sale', 'sucre']

export default function AddExtraModal({ open, onClose, onSuccess, session, extras, replaceExtraId }: AddExtraModalProps) {
  const [isPending, setIsPending] = useState(false)
  const [pickingVariantsFor, setPickingVariantsFor] = useState<ExtraCatalog | null>(null)

  const isReplaceMode = !!replaceExtraId

  function handleClose() {
    setPickingVariantsFor(null)
    onClose()
  }

  function handleExtraClick(extra: ExtraCatalog) {
    const variants = variantsFor(extra.name)
    if (variants) {
      setPickingVariantsFor(extra)
      return
    }
    handleQuickAdd(extra)
  }

  function handlePickVariant(variant: string) {
    if (!pickingVariantsFor) return
    handleQuickAdd(pickingVariantsFor, `${pickingVariantsFor.name} (${variant})`)
  }

  async function handleQuickAdd(extra: ExtraCatalog, nameOverride?: string) {
    if (!session) return
    setIsPending(true)
    const extraName = nameOverride ?? extra.name
    try {
      const body = isReplaceMode
        ? {
            action:       'replace_extra',
            old_extra_id: replaceExtraId,
            session_id:   session.id,
            extra_id:     extra.id,
            extra_name:   extraName,
            quantity:     1,
          }
        : {
            action:     'add_extra',
            session_id: session.id,
            extra_id:   extra.id,
            extra_name: extraName,
            quantity:   1,
          }

      const res = await fetch('/api/bar/drinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        console.error('Erreur ajout extra:', data.error)
      } else {
        handleClose()
        onSuccess()
      }
    } catch (e) {
      console.error('Erreur réseau:', e)
    } finally {
      setIsPending(false)
    }
  }

  const activeExtras = extras.filter(e => e.is_active).sort((a, b) => a.sort_order - b.sort_order)

  const grouped = CATEGORY_ORDER.reduce<Record<string, ExtraCatalog[]>>((acc, cat) => {
    acc[cat] = activeExtras.filter(e => (e.category ?? 'sucre') === cat)
    return acc
  }, {})

  const unknownExtras = activeExtras.filter(e => !e.category || !CATEGORY_ORDER.includes(e.category))
  if (unknownExtras.length > 0) {
    grouped['sucre'] = [...(grouped['sucre'] ?? []), ...unknownExtras.filter(u => !grouped['sucre']?.find(x => x.id === u.id))]
  }

  const hasCategories = CATEGORY_ORDER.some(cat => grouped[cat]?.length > 0)

  const modalTitle = isReplaceMode
    ? `Remplacer l'extra — ${session?.first_name ?? ''}`
    : `Ajouter un extra — ${session?.first_name ?? ''}`

  return (
    <Modal open={open} onClose={handleClose} title={pickingVariantsFor ? `${pickingVariantsFor.name} — ${session?.first_name ?? ''}` : modalTitle} size="md">
      {pickingVariantsFor ? (
        <div className="space-y-5">
          <button
            onClick={() => setPickingVariantsFor(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={16} /> Retour
          </button>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Choisissez</p>
            <div className="grid grid-cols-2 gap-2">
              {variantsFor(pickingVariantsFor.name)!.map(variant => (
                <button
                  key={variant}
                  type="button"
                  disabled={isPending}
                  onClick={() => handlePickVariant(variant)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 text-left hover:border-noma-400 hover:bg-noma-50 active:scale-[0.97] transition-all"
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={handleClose} className="w-full">Annuler</Button>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        {isReplaceMode && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <RefreshCw size={14} className="shrink-0" />
            Choisissez le nouvel extra
          </div>
        )}
        {hasCategories ? (
          CATEGORY_ORDER.map(cat => {
            const items = grouped[cat]
            if (!items?.length) return null
            const config = CATEGORY_CONFIG[cat]
            return (
              <div key={cat} className={config.sectionClass}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {config.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(extra => (
                    <button
                      key={extra.id}
                      onClick={() => handleExtraClick(extra)}
                      disabled={isPending}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left active:scale-[0.97] ${config.btnClass}`}
                    >
                      {extra.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {activeExtras.map(extra => (
              <button
                key={extra.id}
                onClick={() => handleExtraClick(extra)}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-transparent text-sm font-medium text-slate-700 hover:text-purple-700 transition-all duration-150 text-left active:scale-[0.97]"
              >
                <Cookie size={15} className="text-purple-400 shrink-0" />
                {extra.name}
              </button>
            ))}
          </div>
        )}
        <div className="pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={handleClose} className="w-full">Fermer</Button>
        </div>
      </div>
      )}
    </Modal>
  )
}
