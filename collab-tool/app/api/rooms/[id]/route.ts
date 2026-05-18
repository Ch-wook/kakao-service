import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, key)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase()
    const { id } = await params

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: '유효하지 않은 방 ID입니다' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('id, title, share_code, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching room:', error)
    const msg = (error as { message?: string })?.message ?? '방 조회 중 오류가 발생했습니다'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase()
    const { id } = await params
    const body = await request.json()
    const { nickname } = body

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json({ error: '닉네임이 필요합니다' }, { status: 400 })
    }

    if (nickname.length > 20) {
      return NextResponse.json({ error: '닉네임은 20자 이하여야 합니다' }, { status: 400 })
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', id)
      .eq('nickname', nickname)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('participants')
        .update({ last_active: new Date().toISOString() })
        .eq('id', existing.id)
      return NextResponse.json(existing, { status: 200 })
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({ room_id: id, nickname })
      .select()
      .single()

    if (participantError) throw participantError

    return NextResponse.json(participant, { status: 201 })
  } catch (error) {
    console.error('Error adding participant:', error)
    const msg = (error as { message?: string })?.message ?? '참여자 추가 중 오류가 발생했습니다'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}