'use client'

import { useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { DrinkCatalog, DrinkAddon, SessionWithDetails } from '@/types'
import { Coffee, ChevronLeft, Check, RefreshCw } from 'lucide-react'

interface AddDrinkModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  session: SessionWithDetails | null
  drinks: DrinkCatalog[]
  addons: DrinkAddon[]
  replaceDrinkId?: string
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const DIABOLO_FLAVORS = ['P\u00eache', 'Menthe', 'Grenadine', 'Citron', 'Violette', 'Jus de citron']

function isDiabolo(name: string): boolean {
  return normalize(name) === 'diabolo'
}

const TEA_FLAVORS = ['Mangue', 'Fruit rouge', 'Menthe', 'Rooibos']

function isTea(name: string): boolean {
  return normalize(name) === 'the'
}

const DIRECT_ADD_DRINKS = ["verre d'eau"]

function isDirectAdd(name: string): boolean {
  return DIRECT_ADD_DRINKS.includes(normalize(name))
}

export default function AddDrinkModal({ open, onClose, onSuccess, session, drinks, addons, replaceDrinkId }: AddDrinkModalProps) {
  const [step,           setStep]         = useState<'drink' | 'addons' | 'flavor'>('drink')
  const [selectedDrink,  setSelectedDrink]= useState<DrinkCatalog | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [temperature,    setTemperature]  = useState<'hot' | 'ice'>('hot')
  const [isPending,      setIsPending]    = useState(false)

  const isReplaceMode = !!replaceDrinkId

  function handleClose() {
    setStep('drink'); setSelectedDrink(null); setSelectedAddons([]); setTemperature('hot')
    onClose()
  }

  function handlePickDrink(drink: DrinkCatalog) {
    if (isDirectAdd(drink.name)) {
      submitDrink(drink, [], drink.name)
      return
    }
    setSelectedDrink(drink)
    setTemperature('hot')
    setStep(isDiabolo(drink.name) || isTea(drink.name) ? 'flavor' : 'addons')
  }

  function handlePickFlavor(flavor: string) {
    if (!selectedDrink) return
    const suffix = isTea(selectedDrink.name) && temperature === 'ice' ? ' Glacé' : ''
    submitDrink(selectedDrink, [], `${selectedDrink.name} (${flavor})${suffix}`)
  }

  function toggleAddon(id: string) {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  async function submitDrink(drink: DrinkCatalog, addonIds: string[], nameOverride?: string) {
    if (!session) return
    setIsPending(true)
    const drinkName = nameOverride ?? (temperature === 'ice' ? `${drink.name} (Glacé)` : drink.name)
    try {
      const body = isReplaceMode
        ? {
            action:        'replace_drink',
            old_drink_id:  replaceDrinkId,
            session_id:    session.id,
            drink_id:      drink.id,
            drink_name:    drinkName,
            quantity:      1,
            addon_ids:     addonIds,
          }
        : {
            action:     'add_drink',
            session_id: session.id,
            drink_id:   drink.id,
            drink_name: drinkName,
            quantity:   1,
            addon_ids:  addonIds,
          }

      const res = await fetch('/api/bar/drinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        console.error('Erreur boisson:', data.error)
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

  const activeAddons = addons.filter(a => a.is_active)

  const activeDrinks = useMemo(
    () => drinks
      .filter(d => d.is_active)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [drinks]
  )

  const addonTotal = activeAddons
    .filter(a => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + (a.price ?? 0), 0)

  const modalTitle = isReplaceMode
    ? `Remplacer la boisson — ${session?.first_name ?? ''}`
    : step === 'drink'
      ? `Boisson — ${session?.first_name ?? ''}`
      : step === 'flavor'
        ? `Parfum — ${selectedDrink?.name ?? ''}`
        : `Suppléments — ${selectedDrink?.name ?? ''}`

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle} size="xl">
      {step === 'drink' && (
        <div className="space-y-6">
          {isReplaceMode && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <RefreshCw size={14} className="shrink-0" />
              Choisissez la boisson de remplacement
            </div>
          )}

          {activeDrinks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucune boisson disponible</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {activeDrinks.map(drink => (
                <button
                  key={drink.id}
                  onClick={() => handlePickDrink(drink)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 hover:bg-noma-50 hover:border-noma-200 border border-transparent text-sm font-medium text-slate-700 text-left active:scale-[0.97] transition-all duration-150"
                >
                  <Coffee size={14} className="text-noma-400 shrink-0" />
                  <span>{drink.name}</span>
                  {drink.description && (
                    <span className="text-[11px] text-slate-400 ml-auto pl-2 truncate">{drink.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={handleClose} className="w-full">Fermer</Button>
          </div>
        </div>
      )}

      {step === 'flavor' && selectedDrink && (
        <div className="space-y-5">
          <button
            onClick={() => { setStep('drink'); setSelectedDrink(null) }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={16} /> Changer de boisson
          </button>

          <div className="bg-noma-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <Coffee size={18} className="text-noma-500" />
            <span className="font-semibold text-noma-800">{selectedDrink.name}</span>
          </div>

          {isTea(selectedDrink.name) && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Température</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTemperature('hot')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    temperature === 'hot'
                      ? 'border-orange-400 bg-orange-50 text-orange-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  ☕ Chaud
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature('ice')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    temperature === 'ice'
                      ? 'border-blue-400 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  🧊 Glacé
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Choisissez un parfum</p>
            <div className="grid grid-cols-2 gap-2">
              {(isTea(selectedDrink.name) ? TEA_FLAVORS : DIABOLO_FLAVORS).map(flavor => (
                <button
                  key={flavor}
                  type="button"
                  disabled={isPending}
                  onClick={() => handlePickFlavor(flavor)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 text-left hover:border-noma-400 hover:bg-noma-50 active:scale-[0.97] transition-all"
                >
                  {flavor}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={handleClose} className="w-full">Annuler</Button>
          </div>
        </div>
      )}

      {step === 'addons' && selectedDrink && (
        <div className="space-y-5">
          <button
            onClick={() => { setStep('drink'); setSelectedAddons([]); setTemperature('hot') }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={16} /> Changer de boisson
          </button>

          <div className="bg-noma-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <Coffee size={18} className="text-noma-500" />
            <div>
              <span className="font-semibold text-noma-800">{selectedDrink.name}</span>
              {selectedDrink.description && (
                <p className="text-xs text-noma-600 mt-0.5">{selectedDrink.description}</p>
              )}
            </div>
          </div>

          {/* Température */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Température</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTemperature('hot')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  temperature === 'hot'
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                ☕ Chaud
              </button>
              <button
                type="button"
                onClick={() => setTemperature('ice')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  temperature === 'ice'
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                🧊 Glacé
              </button>
            </div>
          </div>

          {activeAddons.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Suppléments (optionnel)</p>
              <div className="grid grid-cols-2 gap-2">
                {activeAddons.map(addon => {
                  const checked = selectedAddons.includes(addon.id)
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        checked
                          ? 'border-noma-400 bg-noma-50 text-noma-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{addon.name}</span>
                      <div className="flex items-center gap-2">
                        {addon.price != null && (
                          <span className="text-xs text-slate-400">+{addon.price.toFixed(2)}€</span>
                        )}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${checked ? 'border-noma-500 bg-noma-500' : 'border-slate-300'}`}>
                          {checked && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedAddons.length > 0 && addonTotal > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-2 text-sm text-slate-600">
              Supplément total : <strong>+{addonTotal.toFixed(2)} €</strong>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={handleClose} className="flex-1">Annuler</Button>
            <Button
              variant="primary"
              loading={isPending}
              onClick={() => submitDrink(selectedDrink, selectedAddons)}
              className="flex-1"
            >
              {isReplaceMode ? 'Remplacer' : 'Ajouter'}
              {selectedAddons.length > 0 && ` (${selectedAddons.length} supplément${selectedAddons.length > 1 ? 's' : ''})`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
