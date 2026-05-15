'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            닉네임 설정
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              협업에 참여할 닉네임을 입력해주세요. 
              <br />
              최대 20자까지 가능합니다.
            </p>

            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError('')
                }}
                placeholder="예: 준호, 민지"
                disabled={isLoading}
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                autoFocus
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {nickname.length}/20
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              disabled={!nickname.trim()}
              className="flex-1"
            >
              입장하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
