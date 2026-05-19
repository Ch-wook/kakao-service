import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인하세요.')
  return createClient(url, key)
}

/**
 * POST /api/rooms - 새 방 생성
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: '제목이 필요합니다' }, { status: 400 })
    }

    if (title.trim().length > 50) {
      return NextResponse.json({ error: '제목은 50자 이하여야 합니다' }, { status: 400 })
    }

    const maxRooms = parseInt(process.env.MAX_ROOMS ?? '300', 10)
    const { count } = await supabase.from('rooms').select('*', { count: 'exact', head: true })
    if (count !== null && count >= maxRooms) {
      return NextResponse.json(
        { error: '서버 방 생성 한도에 도달했습니다. 관리자에게 문의하세요.' },
        { status: 503 }
      )
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({ title: title.trim() })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    const msg = (error as { message?: string })?.message ?? String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/rooms - 공유 코드로 방 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const searchParams = request.nextUrl.searchParams
    const shareCode = searchParams.get('shareCode')

    if (shareCode) {
      // 공유 코드로 방 조회
      const { data, error } = await supabase
        .from('rooms')
        .select('id, title, share_code, created_at')
        .eq('share_code', shareCode)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: '방을 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    // shareCode가 없으면 에러
    return NextResponse.json(
      { error: 'shareCode 파라미터가 필요합니다' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: '방 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
