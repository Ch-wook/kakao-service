'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GlobalError({
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
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h1>
        <p className="text-sm text-gray-500 mb-6">
          일시적인 문제가 발생했습니다.<br />다시 시도하거나 홈으로 돌아가세요.
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
