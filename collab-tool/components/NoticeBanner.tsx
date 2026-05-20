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
    <div className="flex-none bg-amber-50 border-b border-amber-100">
      {!editing ? (
        <div className="flex items-start gap-2 px-3 py-2">
          {/* 메가폰 */}
          <Megaphone size={12} className="text-amber-500 flex-none mt-0.5" />

          {/* 본문 — 줄바꿈 유지, truncate 없음 */}
          <p className="flex-1 text-[11px] text-amber-900 font-medium whitespace-pre-wrap wrap-break-word leading-relaxed min-w-0">
            {content}
          </p>

          {/* 우측 액션 */}
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
      ) : (
        /* 편집 모드 */
        <div className="px-3 py-2 space-y-1.5">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            rows={Math.max(2, draft.split('\n').length)}
            className="w-full px-2.5 py-1.5 text-[11px] text-gray-800 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400">{draft.length}/300</span>
            <div className="flex items-center gap-1.5">
              {confirmDelete ? (
                <>
                  <span className="text-[10px] text-gray-500">삭제할까요?</span>
                  <button
                    onClick={async () => { await onDelete(); setEditing(false) }}
                    className="text-[10px] text-red-500 font-semibold px-2 py-1 rounded-lg active:bg-red-50"
                  >삭제</button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-gray-400 px-2 py-1 rounded-lg active:bg-gray-100"
                  >취소</button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-gray-300 active:text-red-400 rounded-lg"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <button
                onClick={() => { setEditing(false); setConfirmDelete(false) }}
                className="px-2.5 py-1 text-[10px] text-gray-500 font-medium rounded-xl active:bg-gray-100"
              >취소</button>
              <button
                onClick={handleSave}
                disabled={!draft.trim() || saving}
                className="flex items-center gap-0.5 px-2.5 py-1 text-[10px] text-white font-semibold bg-amber-400 rounded-xl active:bg-amber-500 disabled:opacity-50"
              >
                {saving
                  ? <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Check size={10} />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 작성자/시간 */}
      {!editing && (updatedBy || updatedAt) && (
        <div className="px-3 pb-1.5 -mt-1">
          <span className="text-[9px] text-amber-400">
            {updatedBy && <span className="font-medium">{updatedBy}</span>}
            {updatedBy && updatedAt && ' · '}
            {updatedAt && formatTime(updatedAt)}
          </span>
        </div>
      )}
    </div>
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-none w-full flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-100 active:bg-gray-100 transition-colors"
      >
        <Megaphone size={10} className="text-gray-300 flex-none" />
        <span className="text-[10px] text-gray-300 font-medium">공지 등록하기</span>
      </button>
    )
  }

  return (
    <div className="flex-none bg-amber-50 border-b border-amber-100 px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Megaphone size={12} className="text-amber-500 flex-none" />
        <span className="text-[11px] font-semibold text-amber-700">공지 등록</span>
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder="공지 내용을 입력하세요"
        className="w-full px-2.5 py-1.5 text-[11px] text-gray-800 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-amber-400">{draft.length}/300</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setOpen(false); setDraft('') }}
            className="px-2.5 py-1 text-[10px] text-gray-500 font-medium rounded-xl active:bg-gray-100"
          >취소</button>
          <button
            onClick={handleSave}
            disabled={!draft.trim() || saving}
            className="flex items-center gap-0.5 px-2.5 py-1 text-[10px] text-white font-semibold bg-amber-400 rounded-xl active:bg-amber-500 disabled:opacity-50"
          >
            {saving
              ? <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
              : <Check size={10} />}
            등록
          </button>
        </div>
      </div>
    </div>
  )
}
