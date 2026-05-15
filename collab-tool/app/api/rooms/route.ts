import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * GET /api/rooms - 모든 방 조회 (검색)
 */
export async function GET(request: NextRequest) {
  try {
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
