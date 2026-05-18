'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { CheckCircle2, Minus } from 'lucide-react'
import type { Widget } from '@/types'

interface AddWidgetDrawerProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: Widget['type'], title: string) => Promise<Widget | null>
  error?: string | null
}

const WIDGET_OPTIONS: {
  type: Widget['type']
  label: string
  description: string
  emoji: string
}[] = [
  {
    type: 'checklist',
    label: '체크리스트',
    description: '준비물, 할 일을 함께 체크하세요',
    emoji: '✅',
  },
  {
    type: 'expense',
    label: '정산 (N빵)',
    description: '총 금액 입력 후 1인당 금액을 자동 계산해요',
    emoji: '💰',
  },
]

export default function AddWidgetDrawer({ isOpen, onClose, onAdd, error }: AddWidgetDrawerProps) {
  const [selectedType, setSelectedType] = useState<Widget['type']>('checklist')
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const widgetTitle =
      title.trim() ||
      WIDGET_OPTIONS.find((o) => o.type === selectedType)?.label ||
      '위젯'

    setIsLoading(true)
    try {
      const result = await onAdd(selectedType, widgetTitle)
      if (result) {
        setTitle('')
        onClose()
      }
      // result가 null이면 useWidgets의 error 상태가 설정됨 → 닫지 않고 유지
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('')
      onClose()
    }
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-3xl max-h-[90vh]">
          {/* 드래그 핸들 */}
          <div className="flex justify-center pt-3 pb-1 flex-none">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-none">
            <Drawer.Title className="text-lg font-bold text-gray-900">
              위젯 추가
            </Drawer.Title>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-xl transition-colors"
              aria-label="닫기"
            >
              <Minus size={20} />
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
              {/* 위젯 타입 선택 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">위젯 종류</p>
                <div className="space-y-2">
                  {WIDGET_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => setSelectedType(option.type)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-colors ${
                        selectedType === option.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-100 bg-gray-50 active:border-gray-200'
                      }`}
                    >
                      <span className="text-2xl">{option.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                      </div>
                      {selectedType === option.type && (
                        <CheckCircle2 size={18} className="ml-auto text-blue-500 flex-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 위젯 제목 입력 */}
              <div>
                <label
                  htmlFor="drawer-widget-title"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  제목{' '}
                  <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <input
                  id="drawer-widget-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    WIDGET_OPTIONS.find((o) => o.type === selectedType)?.label
                  }
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* 추가 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold text-base active:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    추가 중...
                  </span>
                ) : (
                  '추가하기'
                )}
              </button>

              {/* iOS 하단 safe area 여백 */}
              <div className="h-safe-bottom" />
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
