'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, FileText } from 'lucide-react'
import type { Widget, MemoData } from '@/types'

interface MemoWidgetProps {
  widget: Widget
  nickname?: string
  onUpdateData: (widgetId: string, data: MemoData) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

export default function MemoWidget({ widget, nickname, onUpdateData, onDeleteWidget }: MemoWidgetProps) {
  const data = widget.data as unknown as MemoData
  const [content, setContent] = useState(data.content ?? '')
  const [savedBy, setSavedBy] = useState(data.saved_by as string | undefined)
  const [savedAt, setSavedAt] = useState(data.updated_at)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContent = useRef(data.content ?? '')

  // 외부 Realtime 업데이트 반영 (다른 사용자가 수정 시)
  useEffect(() => {
    const incoming = (widget.data as unknown as MemoData).content ?? ''
    if (incoming !== lastSavedContent.current) {
      setContent(incoming)
      lastSavedContent.current = incoming
      setSavedBy((widget.data as Record<string, unknown>).saved_by as string | undefined)
      setSavedAt((widget.data as unknown as MemoData).updated_at)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data])

  const save = useCallback(
    async (text: string) => {
      if (text === lastSavedContent.current) return
      setSaveState('saving')
      const newData: MemoData & { saved_by?: string } = {
        content: text,
        updated_at: new Date().toISOString(),
        saved_by: nickname,
      }
      const ok = await onUpdateData(widget.id, newData)
      if (ok) {
        lastSavedContent.current = text
        setSavedBy(nickname)
        setSavedAt(newData.updated_at)
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 1500)
      } else {
        setSaveState('idle')
      }
    },
    [widget.id, nickname, onUpdateData]
  )

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    setContent(text)
    setSaveState('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(text), 800)
  }

  function formatSavedAt(iso?: string) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const charCount = content.length
  const MAX_CHARS = 2000

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-amber-400" />
          <span className="text-sm font-bold text-gray-800">{widget.title || '메모'}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 저장 상태 */}
          <span className={`text-[11px] transition-opacity ${saveState === 'idle' && !savedAt ? 'opacity-0' : 'opacity-100'}`}>
            {saveState === 'saving' && (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                저장 중
              </span>
            )}
            {saveState === 'saved' && <span className="text-emerald-500 font-medium">저장됨</span>}
            {saveState === 'idle' && savedAt && (
              <span className="text-gray-300">
                {savedBy ? `${savedBy} · ` : ''}{formatSavedAt(savedAt)}
              </span>
            )}
          </span>
          {/* 삭제 */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">삭제?</span>
              <button
                onClick={() => onDeleteWidget(widget.id)}
                className="text-xs text-red-500 font-semibold px-1.5 py-0.5 active:bg-red-50 rounded"
              >
                확인
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-400 px-1.5 py-0.5 active:bg-gray-100 rounded"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-gray-300 active:text-red-400 transition-colors rounded-lg active:bg-red-50"
              aria-label="위젯 삭제"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 텍스트 영역 */}
      <div className="relative">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="여기에 메모를 입력하세요&#10;모든 참여자가 함께 편집할 수 있어요"
          maxLength={MAX_CHARS}
          rows={8}
          className="w-full px-4 py-3 text-sm text-gray-800 placeholder-gray-300 bg-transparent resize-none focus:outline-none leading-relaxed"
        />
        {/* 글자수 */}
        {charCount > 0 && (
          <div className="absolute bottom-2 right-3 text-[10px] text-gray-300">
            {charCount}/{MAX_CHARS}
          </div>
        )}
      </div>
    </div>
  )
}
