import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/rooms/[id] - 특정 방 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    // UUID 형식 검증
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 방 ID입니다' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('id, title, share_code, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '방을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: '방 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rooms/[id]/participants - 참여자 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    const { nickname } = body

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { error: '닉네임이 필요합니다' },
        { status: 400 }
      )
    }

    if (nickname.length > 20) {
      return NextResponse.json(
        { error: '닉네임은 20자 이하여야 합니다' },
        { status: 400 }
      )
    }

    // 1. 방이 존재하는지 확인
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', id)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: '방을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 2. 참여자 추가
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        room_id: id,
        nickname,
      })
      .select()
      .single()

    if (participantError) {
      // 닉네임 중복 체크
      if (participantError.code === '23505') {
        return NextResponse.json(
          { error: '이미 사용 중인 닉네임입니다' },
          { status: 409 }
        )
      }
      throw participantError
    }

    return NextResponse.json(participant, { status: 201 })
  } catch (error) {
    console.error('Error adding participant:', error)
    return NextResponse.json(
      { error: '참여자 추가 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
