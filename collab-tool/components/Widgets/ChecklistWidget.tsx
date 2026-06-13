'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react'
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteWidget, setConfirmDeleteWidget] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const data = widget.data as unknown as ChecklistData
  const items: ChecklistItem[] = data?.items || []
  const completedCount = items.filter((i) => i.completed).length
  const incompleteItems = items.filter((i) => !i.completed)
  const completedItems = items.filter((i) => i.completed)
  const allCompleted = items.length > 0 && completedCount === items.length

  const handleAdd = async () => {
    const text = newItemText.trim()
    if (!text) return

    setIsAdding(true)
    try {
      // 쉼표로 구분된 여러 항목 한 번에 추가 지원
      const parts = text.split(',').map((s) => s.trim()).filter(Boolean)
      // 중복 제거 (이미 존재하는 항목과 입력 내 중복)
      const existingTitles = new Set(items.map((i) => i.title))
      const unique: string[] = []
      for (const p of parts) {
        if (!existingTitles.has(p) && !unique.includes(p)) unique.push(p)
      }
      for (const item of unique) {
        await onAdd(widget.id, item, nickname)
      }
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
    setConfirmDeleteId(null)
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

  const handleDeleteItem = async (itemId: string) => {
    setConfirmDeleteId(null)
    await onDelete(widget.id, itemId)
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
          confirmDeleteWidget ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">삭제?</span>
              <button
                onClick={() => { onDeleteWidget(widget.id); setConfirmDeleteWidget(false) }}
                className="text-xs text-red-500 font-semibold px-1.5 py-0.5 active:bg-red-50 rounded"
              >
                확인
              </button>
              <button
                onClick={() => setConfirmDeleteWidget(false)}
                className="text-xs text-gray-400 px-1.5 py-0.5 active:bg-gray-100 rounded"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteWidget(true)}
              className="p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors rounded-lg"
              aria-label="위젯 삭제"
            >
              <Trash2 size={14} />
            </button>
          )
        )}
      </div>

      {/* 진행률 바 */}
      {items.length > 0 && (
        <div className="h-0.5 bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ${allCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* 전체 완료 축하 */}
      {allCompleted && (
        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 border-b border-emerald-100">
          <PartyPopper size={16} className="text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-600">모두 완료! 🎉</span>
        </div>
      )}

      {/* 미완료 항목 목록 */}
      <ul className="divide-y divide-gray-50">
        {items.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-gray-300">
            항목을 추가해보세요
          </li>
        )}
        {incompleteItems.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            {/* 체크 버튼 */}
            <button
              onClick={() => onToggle(widget.id, item.id)}
              className="flex-none text-gray-300 active:scale-95 transition-transform"
              aria-label="완료"
            >
              <Circle size={22} />
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
                <span className="flex-1 text-sm leading-relaxed text-gray-800">
                  {item.title}
                </span>

                {/* 담당자 */}
                {item.assignee && (
                  <span className="text-xs text-gray-300 flex-none">{item.assignee}</span>
                )}

                {/* 편집/삭제 버튼 */}
                <div className="flex items-center gap-1 flex-none">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-gray-300 hover:text-blue-400 active:text-blue-500 active:bg-blue-50 rounded-lg transition-colors"
                    aria-label="수정"
                  >
                    <Pencil size={13} />
                  </button>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[11px] text-red-500 font-semibold px-1.5 py-0.5 rounded active:bg-red-50"
                      >삭제</button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[11px] text-gray-400 px-1 py-0.5 rounded active:bg-gray-100"
                      >취소</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 active:bg-red-50 rounded-lg transition-colors"
                      aria-label="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* 완료 항목 (접기/펼치기) */}
      {completedItems.length > 0 && (
        <>
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 font-medium active:bg-gray-100 transition-colors"
          >
            <span>완료된 항목 ({completedItems.length})</span>
            {hideCompleted ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!hideCompleted && (
            <ul className="divide-y divide-gray-50 bg-gray-50/50">
              {completedItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => onToggle(widget.id, item.id)}
                    className="flex-none active:scale-95 transition-transform"
                    aria-label="완료 취소"
                  >
                    <CheckCircle2 size={22} className="text-blue-500" />
                  </button>
                  <span className="flex-1 text-sm leading-relaxed line-through text-gray-300">
                    {item.title}
                  </span>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-0.5 flex-none">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[11px] text-red-500 font-semibold px-1.5 py-0.5 rounded active:bg-red-50"
                      >삭제</button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[11px] text-gray-400 px-1 py-0.5 rounded active:bg-gray-100"
                      >취소</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="p-1.5 text-gray-200 hover:text-red-300 active:text-red-400 rounded-lg transition-colors flex-none"
                      aria-label="삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

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
            placeholder="새 항목 추가... (쉼표로 여러 개)"
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
