import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  const password = req.headers.get('x-admin-password')
  return !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const [{ data: rooms, error: roomsError }, { data: participants }, { data: widgets }] =
      await Promise.all([
        supabase.from('rooms').select('*').order('created_at', { ascending: false }),
        supabase.from('participants').select('room_id, last_active'),
        supabase.from('widgets').select('room_id, updated_at'),
      ])

    if (roomsError) throw roomsError

    const roomsWithStats = (rooms ?? []).map((room) => {
      const roomParticipants = (participants ?? []).filter((p) => p.room_id === room.id)
      const roomWidgets = (widgets ?? []).filter((w) => w.room_id === room.id)

      const lastActivities = [
        ...roomParticipants.map((p) => p.last_active),
        ...roomWidgets.map((w) => w.updated_at),
        room.created_at,
      ].filter(Boolean).sort().reverse()

      return {
        ...room,
        participantCount: roomParticipants.length,
        widgetCount: roomWidgets.length,
        lastActivity: lastActivities[0] ?? room.created_at,
      }
    })

    return NextResponse.json(roomsWithStats)
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? '조회 중 오류가 발생했습니다'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
