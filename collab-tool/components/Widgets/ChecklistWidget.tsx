'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import type { Widget, ChecklistData, ChecklistItem } from '@/types'

interface ChecklistWidgetProps {
  widget: Widget
  nickname?: string
  onToggle: (widgetId: string, itemId: string) => Promise<boolean>
  onAdd: (widgetId: string, text: string, user?: string) => Promise<boolean>
  onUpdate: (widgetId: string, itemId: string, newText: string) => Promise<boolean>
  onDelete: (widgetId: string, itemId: string) => Promise<boolean>
  onDeleteWidget?: (widgetId: string) => Promise<boolean>
}

export default function ChecklistWidget({
  widget,
  nickname,
  onToggle,
  onAdd,
  onUpdate,
  onDelete,
  onDeleteWidget,
}: ChecklistWidgetProps) {
  const [newItemText, setNewItemText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const data = widget.data as unknown as ChecklistData
  const items: ChecklistItem[] = data?.items || []
  const completedCount = items.filter((i) => i.completed).length

  const handleAdd = async () => {
    const text = newItemText.trim()
    if (!text) return

    setIsAdding(true)
    try {
      await onAdd(widget.id, text, nickname)
      setNewItemText('')
      inputRef.current?.focus()
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id)
    setEditingText(item.title)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const text = editingText.trim()
    if (text) await onUpdate(widget.id, editingId, text)
    setEditingId(null)
    setEditingText('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    else if (e.key === 'Escape') { setEditingId(null); setEditingText('') }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={17} className="text-blue-500 flex-none" />
          <h3 className="font-semibold text-gray-900 text-sm">
            {widget.title || '체크리스트'}
          </h3>
          {items.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {completedCount}/{items.length}
            </span>
          )}
        </div>
        {onDeleteWidget && (
          <button
            onClick={() => onDeleteWidget(widget.id)}
            className="p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors rounded-lg"
            aria-label="위젯 삭제"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* 진행률 바 */}
      {items.length > 0 && (
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* 아이템 목록 */}
      <ul className="divide-y divide-gray-50">
        {items.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-gray-300">
            항목을 추가해보세요
          </li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            {/* 체크 버튼 */}
            <button
              onClick={() => onToggle(widget.id, item.id)}
              className="flex-none text-gray-300 active:scale-95 transition-transform"
              aria-label={item.completed ? '완료 취소' : '완료'}
            >
              {item.completed ? (
                <CheckCircle2 size={22} className="text-blue-500" />
              ) : (
                <Circle size={22} />
              )}
            </button>

            {/* 텍스트 / 편집 */}
            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="p-1.5 text-green-600 active:bg-green-50 rounded-lg"
                  aria-label="저장"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditingText('') }}
                  className="p-1.5 text-gray-400 active:bg-gray-100 rounded-lg"
                  aria-label="취소"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <>
                <span
                  className={`flex-1 text-sm leading-relaxed ${
                    item.completed ? 'line-through text-gray-300' : 'text-gray-800'
                  }`}
                >
                  {item.title}
                </span>

                {/* 담당자 */}
                {item.assignee && (
                  <span className="text-xs text-gray-300 flex-none">{item.assignee}</span>
                )}

                {/* 편집/삭제 버튼 - 항상 표시 (모바일 호환) */}
                <div className="flex items-center gap-1 flex-none">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-gray-300 hover:text-blue-400 active:text-blue-500 active:bg-blue-50 rounded-lg transition-colors"
                    aria-label="수정"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDelete(widget.id, item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 active:bg-red-50 rounded-lg transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* 새 항목 추가 입력 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-gray-300 flex-none" />
          <input
            ref={inputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="새 항목 추가..."
            disabled={isAdding}
            className="flex-1 text-sm text-gray-700 placeholder-gray-300 bg-transparent focus:outline-none disabled:opacity-50"
          />
          {newItemText.trim() && (
            <button
              onClick={handleAdd}
              disabled={isAdding}
              className="text-xs font-semibold text-blue-500 active:text-blue-700 disabled:opacity-50 px-1"
            >
              추가
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
