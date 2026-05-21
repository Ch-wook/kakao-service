'use client'

import { useState } from 'react'
import { Megaphone, X, Pencil, Trash2, Check } from 'lucide-react'
import type { NoticeData } from '@/types'

interface NoticeBannerProps {
  content: string
  updatedBy?: string
  updatedAt?: string
  nickname?: string
  onSave: (data: NoticeData) => Promise<boolean>
  onDelete: () => Promise<boolean>
}

function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function NoticeBanner({
  content,
  updatedBy,
  updatedAt,
  nickname,
  onSave,
  onDelete,
}: NoticeBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (dismissed) return null

  async function handleSave() {
    if (!draft.trim()) return
    setSaving(true)
    const ok = await onSave({
      content: draft.trim(),
      updated_at: new Date().toISOString(),
      updated_by: nickname,
    })
    if (ok) { setEditing(false); setConfirmDelete(false) }
    setSaving(false)
  }

  return (
    <>
      {/* 공지 표시 배너 (항상 컴팩트) */}
      <div className="flex-none bg-amber-50 border-b border-amber-100">
        <div className="flex items-start gap-2 px-3 py-2">
          <Megaphone size={12} className="text-amber-500 flex-none mt-0.5" />
          <p className="flex-1 text-[11px] text-amber-900 font-medium whitespace-pre-wrap break-words leading-relaxed min-w-0 line-clamp-2">
            {content}
          </p>
          <div className="flex items-center gap-0 flex-none">
            <button
              onClick={() => { setDraft(content); setEditing(true) }}
              className="p-1.5 text-amber-400 active:text-amber-600 rounded-lg active:bg-amber-200 transition-colors"
              aria-label="공지 수정"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-amber-300 active:text-amber-500 rounded-lg transition-colors"
              aria-label="공지 숨기기"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        {(updatedBy || updatedAt) && (
          <div className="px-3 pb-1.5 -mt-1">
            <span className="text-[9px] text-amber-400">
              {updatedBy && <span className="font-medium">{updatedBy}</span>}
              {updatedBy && updatedAt && ' · '}
              {updatedAt && formatTime(updatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* 편집 오버레이 (하단 고정) */}
      {editing && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => { setEditing(false); setConfirmDelete(false) }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-50 border-t border-amber-200 rounded-t-2xl px-4 py-4 shadow-xl space-y-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Megaphone size={13} className="text-amber-500 flex-none" />
              <span className="text-sm font-semibold text-amber-700">공지 수정</span>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400">{draft.length}/300</span>
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <span className="text-xs text-gray-500">삭제할까요?</span>
                    <button
                      onClick={async () => { await onDelete(); setEditing(false) }}
                      className="text-xs text-red-500 font-semibold px-2.5 py-1.5 rounded-lg active:bg-red-50"
                    >삭제</button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-gray-400 px-2.5 py-1.5 rounded-lg active:bg-gray-100"
                    >취소</button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-2 text-gray-300 active:text-red-400 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => { setEditing(false); setConfirmDelete(false) }}
                  className="px-3 py-1.5 text-xs text-gray-500 font-medium rounded-xl active:bg-gray-100"
                >취소</button>
                <button
                  onClick={handleSave}
                  disabled={!draft.trim() || saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-white font-semibold bg-amber-400 rounded-xl active:bg-amber-500 disabled:opacity-50"
                >
                  {saving
                    ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={12} />}
                  저장
                </button>
              </div>
            </div>
            <div className="h-safe-bottom" />
          </div>
        </>
      )}
    </>
  )
}

/* ────────────────────────────────────────
   공지 없을 때 — 등록 바
──────────────────────────────────────── */
interface NoticeAddBarProps {
  onAdd: (data: NoticeData) => Promise<boolean>
  nickname?: string
}

export function NoticeAddBar({ onAdd, nickname }: NoticeAddBarProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!draft.trim()) return
    setSaving(true)
    const ok = await onAdd({
      content: draft.trim(),
      updated_at: new Date().toISOString(),
      updated_by: nickname,
    })
    if (ok) { setOpen(false); setDraft('') }
    setSaving(false)
  }

  return (
    <>
      {/* 항상 컴팩트한 등록 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="flex-none w-full flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-100 active:bg-gray-100 transition-colors"
      >
        <Megaphone size={10} className="text-gray-300 flex-none" />
        <span className="text-[10px] text-gray-300 font-medium">공지 등록하기</span>
      </button>

      {/* 등록 폼 — 하단 오버레이 */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => { setOpen(false); setDraft('') }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-50 border-t border-amber-200 rounded-t-2xl px-4 py-4 shadow-xl space-y-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Megaphone size={13} className="text-amber-500 flex-none" />
              <span className="text-sm font-semibold text-amber-700">공지 등록</span>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="공지 내용을 입력하세요"
              className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400">{draft.length}/300</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setOpen(false); setDraft('') }}
                  className="px-3 py-1.5 text-xs text-gray-500 font-medium rounded-xl active:bg-gray-100"
                >취소</button>
                <button
                  onClick={handleSave}
                  disabled={!draft.trim() || saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-white font-semibold bg-amber-400 rounded-xl active:bg-amber-500 disabled:opacity-50"
                >
                  {saving
                    ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={12} />}
                  등록
                </button>
              </div>
            </div>
            <div className="h-safe-bottom" />
          </div>
        </>
      )}
    </>
  )
}
