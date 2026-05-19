'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const router = useRouter()

  return (
    <div className="h-dvh bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-4xl mb-4">😢</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">방을 불러올 수 없어요</h1>
        <p className="text-sm text-gray-500 mb-6">
          네트워크 오류이거나 방이 삭제되었을 수 있어요.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm active:bg-blue-600"
          >
            다시 시도
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm active:bg-gray-200"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  )
}
