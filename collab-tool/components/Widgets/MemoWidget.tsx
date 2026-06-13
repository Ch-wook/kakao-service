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

// 기존 일반 텍스트를 HTML로 변환 (하위 호환)
function plainTextToHtml(text: string): string {
  if (!text) return ''
  // 이미 HTML 태그가 포함되어 있으면 그대로 반환
  if (/<[a-z][\s\S]*?>/i.test(text)) return text
  // 일반 텍스트 → HTML 이스케이프 + 줄바꿈 변환
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

// HTML에서 순수 텍스트 길이 추출
function getTextLength(html: string): number {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '').length
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.innerText || div.textContent || '').length
}

// 위험한 HTML 요소/속성 제거 (XSS 방지)
function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  // 위험 요소 제거
  div.querySelectorAll('script, iframe, object, embed, form, input, button, link, meta').forEach(el => el.remove())
  // on* 이벤트 핸들러, javascript: URL 제거
  div.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      }
      if ((attr.name === 'href' || attr.name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name)
      }
    })
  })
  return div.innerHTML
}

export default function MemoWidget({ widget, nickname, onUpdateData, onDeleteWidget }: MemoWidgetProps) {
  const data = widget.data as unknown as MemoData
  const initialHtml = useRef(plainTextToHtml(data.content ?? ''))
  const [charCount, setCharCount] = useState(() => getTextLength(data.content ?? ''))
  const [savedBy, setSavedBy] = useState(data.saved_by as string | undefined)
  const [savedAt, setSavedAt] = useState(data.updated_at)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContent = useRef(data.content ?? '')
  const editorRef = useRef<HTMLDivElement>(null)
  const isLocalEdit = useRef(false) // 로컬 편집 중인지 추적

  // 초기 콘텐츠 설정
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml.current
    }
  }, [])

  // 외부 Realtime 업데이트 반영 (다른 사용자가 수정 시)
  useEffect(() => {
    const incoming = (widget.data as unknown as MemoData).content ?? ''
    if (incoming !== lastSavedContent.current) {
      const newHtml = plainTextToHtml(incoming)
      lastSavedContent.current = incoming
      setCharCount(getTextLength(incoming))
      setSavedBy((widget.data as Record<string, unknown>).saved_by as string | undefined)
      setSavedAt((widget.data as unknown as MemoData).updated_at)
      // 로컬 편집 중이 아닐 때만 에디터 내용 교체 (커서 위치 보호)
      if (!isLocalEdit.current && editorRef.current) {
        editorRef.current.innerHTML = newHtml
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data])

  const save = useCallback(
    async (html: string) => {
      if (html === lastSavedContent.current) return
      setSaveState('saving')
      const newData: MemoData & { saved_by?: string } = {
        content: html,
        updated_at: new Date().toISOString(),
        saved_by: nickname,
      }
      const ok = await onUpdateData(widget.id, newData)
      if (ok) {
        lastSavedContent.current = html
        setSavedBy(nickname)
        setSavedAt(newData.updated_at)
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 1500)
      } else {
        setSaveState('idle')
      }
      isLocalEdit.current = false
    },
    [widget.id, nickname, onUpdateData]
  )

  function handleInput() {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    const textLen = getTextLength(html)

    // 글자 수 제한 체크
    if (textLen > MAX_CHARS) {
      // 초과 시 마지막 저장 상태로 되돌리지 않고, 그냥 경고만 표시
      // (contentEditable에서 잘라내기가 복잡하므로 저장 시 차단)
    }

    setCharCount(textLen)
    isLocalEdit.current = true
    setSaveState('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (textLen <= MAX_CHARS) {
        save(html)
      }
    }, 800)
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    range.deleteContents()

    if (html) {
      // HTML 붙여넣기 — 위험 요소 제거 후 삽입
      const sanitized = sanitizeHtml(html)
      const fragment = range.createContextualFragment(sanitized)
      range.insertNode(fragment)
      // 커서를 삽입된 콘텐츠 끝으로 이동
      selection.collapseToEnd()
    } else if (text) {
      // 일반 텍스트 — 줄바꿈을 <br>로 변환
      const lines = text.split('\n')
      lines.forEach((line, i) => {
        if (i > 0) {
          range.insertNode(document.createElement('br'))
          selection.collapseToEnd()
        }
        const textNode = document.createTextNode(line)
        range.insertNode(textNode)
        selection.collapseToEnd()
      })
    }

    handleInput()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ctrl+B, Ctrl+I, Ctrl+U 단축키 허용 (브라우저 기본 동작)
    // 글자수 초과 시 입력 방지 (단, 삭제/선택 키는 허용)
    if (charCount >= MAX_CHARS) {
      const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
      const isModifier = e.ctrlKey || e.metaKey
      const isSelectAll = isModifier && e.key === 'a'
      const isCopy = isModifier && e.key === 'c'
      const isCut = isModifier && e.key === 'x'
      const isUndo = isModifier && e.key === 'z'
      const isBold = isModifier && e.key === 'b'
      const isItalic = isModifier && e.key === 'i'
      const isUnderline = isModifier && e.key === 'u'

      if (!allowedKeys.includes(e.key) && !isSelectAll && !isCopy && !isCut && !isUndo && !isBold && !isItalic && !isUnderline) {
        e.preventDefault()
      }
    }
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

  const MAX_CHARS = 3000
  const isOverLimit = charCount > MAX_CHARS

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

      {/* 리치 텍스트 에디터 영역 */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => { isLocalEdit.current = true }}
          onBlur={() => { isLocalEdit.current = false }}
          className="memo-editor w-full px-4 py-3 text-sm text-gray-800 bg-transparent focus:outline-none leading-relaxed min-h-[200px] max-h-[400px] overflow-y-auto"
          role="textbox"
          aria-multiline="true"
          aria-label="메모 입력"
        />
        {/* 글자수 */}
        {charCount > 0 && (
          <div className={`absolute bottom-2 right-3 text-[10px] ${isOverLimit ? 'text-red-500 font-semibold' : 'text-gray-300'}`}>
            {charCount}/{MAX_CHARS}{isOverLimit ? ' (초과)' : ''}
          </div>
        )}
      </div>

      {/* 서식 안내 */}
      <div className="px-4 py-1.5 border-t border-gray-50 flex items-center gap-3">
        <span className="text-[10px] text-gray-300">
          서식 유지 붙여넣기 지원 · Ctrl+B <b className="text-gray-400">굵게</b> · Ctrl+I <i className="text-gray-400">기울임</i> · Ctrl+U <u className="text-gray-400">밑줄</u>
        </span>
      </div>
    </div>
  )
}
