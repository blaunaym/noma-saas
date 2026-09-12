import { NextRequest, NextResponse } from 'next/server'
import { db_addDrink, db_addExtra, db_serveDrink, db_serveExtra, db_deleteDrink, db_replaceDrink, db_deleteExtra, db_replaceExtra } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'add_drink') {
      const result = await db_addDrink({
        session_id: body.session_id,
        drink_id:   body.drink_id,
        drink_name: body.drink_name,
        quantity:   body.quantity ?? 1,
        addon_ids:  body.addon_ids ?? [],
      })
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'add_extra') {
      const result = await db_addExtra({
        session_id: body.session_id,
        extra_id:   body.extra_id,
        extra_name: body.extra_name,
        quantity:   body.quantity ?? 1,
      })
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'serve_drink') {
      const result = await db_serveDrink(body.drink_id)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_drink') {
      const result = await db_deleteDrink(body.drink_id)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'replace_drink') {
      const result = await db_replaceDrink({
        old_drink_id: body.old_drink_id,
        session_id:   body.session_id,
        drink_id:     body.drink_id,
        drink_name:   body.drink_name,
        quantity:     body.quantity ?? 1,
        addon_ids:    body.addon_ids ?? [],
      })
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'serve_extra') {
      const result = await db_serveExtra(body.extra_id)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_extra') {
      const result = await db_deleteExtra(body.extra_id)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'replace_extra') {
      const result = await db_replaceExtra({
        old_extra_id: body.old_extra_id,
        session_id:   body.session_id,
        extra_id:     body.extra_id,
        extra_name:   body.extra_name,
        quantity:     body.quantity ?? 1,
      })
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
