'use client'

import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import Button from '@/components/Shared/Button'
import type { Widget } from '@/types'

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: Widget['type'], title: string) => Promise<Widget | null>
}

const WIDGET_OPTIONS: { type: Widget['type']; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'checklist',
    label: '체크리스트',
    description: '준비물, 할 일을 함께 체크하세요',
    icon: <CheckCircle2 size={20} className="text-blue-500" />,
  },
]

export default function AddWidgetModal({ isOpen, onClose, onAdd }: AddWidgetModalProps) {
  const [selectedType, setSelectedType] = useState<Widget['type']>('checklist')
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const widgetTitle = title.trim() || WIDGET_OPTIONS.find((o) => o.type === selectedType)?.label || '위젯'
    setIsLoading(true)
    try {
      await onAdd(selectedType, widgetTitle)
      setTitle('')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">위젯 추가</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 위젯 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">위젯 종류</label>
            <div className="space-y-2">
              {WIDGET_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setSelectedType(option.type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedType === option.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.icon}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 위젯 제목 */}
          <div>
            <label htmlFor="widget-title" className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <input
              id="widget-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={WIDGET_OPTIONS.find((o) => o.type === selectedType)?.label}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="flex-1"
            >
              추가하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
