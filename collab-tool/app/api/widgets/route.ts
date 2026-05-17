import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/widgets?room_id=xxx - 특정 방의 위젯 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('room_id')

    if (!roomId) {
      return NextResponse.json(
        { error: 'room_id 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('room_id', roomId)
      .order('order', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching widgets:', error)
    return NextResponse.json(
      { error: '위젯 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/widgets - 새 위젯 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, type, title, data: widgetData, order } = body

    if (!room_id || !type) {
      return NextResponse.json(
        { error: 'room_id와 type은 필수입니다' },
        { status: 400 }
      )
    }

    const validTypes = ['checklist', 'expense', 'vote', 'memo', 'schedule', 'roles', 'poll']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '유효하지 않은 위젯 타입입니다' },
        { status: 400 }
      )
    }

    // 방 존재 확인
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', room_id)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: '방을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 기본 데이터 설정
    const defaultData = type === 'checklist' ? { items: [] } : {}

    const { data, error } = await supabase
      .from('widgets')
      .insert({
        room_id,
        type,
        title: title || null,
        data: widgetData ?? defaultData,
        order: order ?? 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating widget:', error)
    return NextResponse.json(
      { error: '위젯 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
