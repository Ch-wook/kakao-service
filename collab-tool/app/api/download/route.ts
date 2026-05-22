import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const fileUrl = request.nextUrl.searchParams.get('url')
  const filename = request.nextUrl.searchParams.get('name') || 'download'

  if (!fileUrl) {
    return new NextResponse('Missing url', { status: 400 })
  }

  // Supabase Storage URL만 허용 (보안)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !fileUrl.startsWith(supabaseUrl)) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  try {
    const upstream = await fetch(fileUrl)
    if (!upstream.ok) {
      return new NextResponse('File not found', { status: 404 })
    }

    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // 브라우저가 파일을 열지 않고 저장하도록 강제
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    }
    if (contentLength) headers['Content-Length'] = contentLength

    // 스트리밍 응답 — 버퍼링 없이 바로 전달
    return new NextResponse(upstream.body, { headers })
  } catch {
    return new NextResponse('Download failed', { status: 500 })
  }
}
