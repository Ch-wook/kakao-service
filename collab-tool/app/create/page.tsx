'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'

const TITLE_SUGGESTIONS = ['여행 준비', '스터디 그룹', '동아리 모임', '팀 프로젝트', '친구 모임', '회식 정산']

export default function CreatePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '방 생성 실패')
      }

      const room = await res.json()
      router.push(`/room/${room.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '방 생성 중 오류가 발생했습니다')
      setIsLoading(false)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="flex-none bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-500 active:bg-gray-100 rounded-xl"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900">새 협업 만들기</h1>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-y-auto px-5 py-8">
        <form onSubmit={handleCreate} className="max-w-md mx-auto space-y-6">
          {/* 아이콘 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Sparkles size={32} className="text-blue-500" />
            </div>
          </div>

          {/* 제목 입력 */}
          <div>
            <label htmlFor="room-title" className="block text-sm font-semibold text-gray-700 mb-2">
              협업 이름
            </label>
            <input
              id="room-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 제주도 여행 준비"
              maxLength={50}
              autoFocus
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-gray-400 text-right">{title.length}/50</p>
          </div>

          {/* 추천 이름 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">추천 이름</p>
            <div className="flex flex-wrap gap-2">
              {TITLE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTitle(s)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-600 active:bg-gray-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 생성 버튼 */}
          <button
            type="submit"
            disabled={!title.trim() || isLoading}
            className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold text-base active:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                만드는 중...
              </span>
            ) : (
              '협업 만들기'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            만들면 바로 링크를 복사해 카톡방에 공유하세요
          </p>
        </form>
      </main>
    </div>
  )
}
