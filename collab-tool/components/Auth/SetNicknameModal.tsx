'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/Shared/Button'

interface SetNicknameModalProps {
  isOpen: boolean
  onNicknameSet: (nickname: string) => void
  isLoading?: boolean
}

export default function SetNicknameModal({
  isOpen,
  onNicknameSet,
  isLoading = false,
}: SetNicknameModalProps) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setNickname('')
      setError('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요')
      return
    }

    if (nickname.length > 20) {
      setError('닉네임은 20자 이하여야 합니다')
      return
    }

    onNicknameSet(nickname)
    setNickname('')
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-sm w-full sm:mx-4 overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">👋</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            환영합니다!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            협업에 참여할 닉네임을 입력해주세요
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3">
          <div className="mb-5">
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setError('')
              }}
              placeholder="닉네임 입력 (최대 20자)"
              disabled={isLoading}
              maxLength={20}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-center"
              autoFocus
            />
            <div className="mt-1.5 text-xs text-gray-400 text-right px-1">
              {nickname.length}/20
            </div>

            {error && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={!nickname.trim()}
            className="w-full !py-3.5 !rounded-2xl !text-base"
          >
            입장하기
          </Button>

          <div className="h-safe-bottom" />
        </form>
      </div>
    </div>
  )
}
