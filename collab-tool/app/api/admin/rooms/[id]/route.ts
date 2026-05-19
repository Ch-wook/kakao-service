import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  const password = req.headers.get('x-admin-password')
  return !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? '삭제 중 오류가 발생했습니다'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
