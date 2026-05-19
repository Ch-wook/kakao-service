'use client'

import { useState } from 'react'
import { CreditCard, Plus, Trash2, Check, X, Users, ChevronDown, ChevronUp } from 'lucide-react'
import type { Widget, FeeData, FeeEntry } from '@/types'
import { generateId } from '@/lib/utils'

interface FeeWidgetProps {
  widget: Widget
  nickname?: string
  participants?: string[]
  onUpdateData: (widgetId: string, data: FeeData) => Promise<boolean>
  onToggleEntry: (widgetId: string, entryId: string) => Promise<boolean>
  onDeleteWidget?: (widgetId: string) => Promise<boolean>
}

export default function FeeWidget({
  widget,
  nickname,
  participants = [],
  onUpdateData,
  onToggleEntry,
  onDeleteWidget,
}: FeeWidgetProps) {
  const raw = widget.data as unknown as Partial<FeeData>
  const data: FeeData = {
    defaultAmount: raw.defaultAmount ?? 0,
    entries: raw.entries ?? [],
  }

  const [isEditingAmount, setIsEditingAmount] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [showSummary, setShowSummary] = useState(true)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingAmount, setEditingEntryAmount] = useState('')

  const paidEntries = data.entries.filter((e) => e.paid)
  const unpaidEntries = data.entries.filter((e) => !e.paid)
  const totalCollected = paidEntries.reduce(
    (s, e) => s + (e.amount ?? data.defaultAmount),
    0
  )
  const totalExpected = data.entries.reduce(
    (s, e) => s + (e.amount ?? data.defaultAmount),
    0
  )

  const fmt = (n: number) => n.toLocaleString('ko-KR')

  const update = (patch: Partial<FeeData>) =>
    onUpdateData(widget.id, { ...data, ...patch })

  const handleDefaultAmountSave = async () => {
    const amount = parseInt(editAmount.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(amount) && amount >= 0) await update({ defaultAmount: amount })
    setIsEditingAmount(false)
  }

  const handleToggle = async (entryId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30)
    await onToggleEntry(widget.id, entryId)
  }

  const handleAddEntry = async () => {
    const names = newName.split(',').map((n) => n.trim()).filter(Boolean)
    const newOnes = names.filter((n) => !data.entries.some((e) => e.name === n))
    if (newOnes.length === 0) return
    const note = newNote.trim() || undefined
    const newEntries: FeeEntry[] = newOnes.map((name) => ({
      id: generateId(),
      name,
      paid: false,
      note: newOnes.length === 1 ? note : undefined, // 여러 명 일괄 추가 시 비고 미적용
    }))
    await update({ entries: [...data.entries, ...newEntries] })
    setNewName('')
    setNewNote('')
    setIsAddingEntry(false)
  }

  const handleRemoveEntry = (id: string) =>
    update({ entries: data.entries.filter((e) => e.id !== id) })

  const handleAmountOverrideSave = async (id: string) => {
    const amount = parseInt(editingAmount.replace(/[^0-9]/g, ''), 10)
    await update({
      entries: data.entries.map((e) =>
        e.id !== id ? e : { ...e, amount: isNaN(amount) || amount <= 0 ? undefined : amount }
      ),
    })
    setEditingEntryId(null)
  }

  const addAllParticipants = async () => {
    const newEntries: FeeEntry[] = participants
      .filter((name) => !data.entries.some((e) => e.name === name))
      .map((name) => ({ id: generateId(), name, paid: false }))
    if (newEntries.length > 0)
      await update({ entries: [...data.entries, ...newEntries] })
  }

  const unaddedParticipants = participants.filter(
    (name) => !data.entries.some((e) => e.name === name)
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CreditCard size={17} className="text-teal-500 flex-none" />
          <h3 className="font-semibold text-gray-900 text-sm">
            {widget.title || '납부 체크'}
          </h3>
          {data.entries.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {paidEntries.length}/{data.entries.length}명 완료
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
      {data.entries.length > 0 && (
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${(paidEntries.length / data.entries.length) * 100}%` }}
          />
        </div>
      )}

      {/* 기본 금액 + 요약 */}
      <div className="px-4 py-4 bg-teal-50 border-b border-gray-100">
        {/* 기본 납부 금액 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-teal-600 font-medium">1인 납부 금액</span>
          {isEditingAmount ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDefaultAmountSave()
                  if (e.key === 'Escape') setIsEditingAmount(false)
                }}
                onBlur={handleDefaultAmountSave}
                className="w-28 text-sm text-right border border-teal-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                autoFocus
                min={0}
              />
              <span className="text-xs text-gray-500">원</span>
              <button onClick={handleDefaultAmountSave} className="p-1 text-teal-600">
                <Check size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditAmount(String(data.defaultAmount))
                setIsEditingAmount(true)
              }}
              className="flex items-baseline gap-1 active:opacity-70"
            >
              <span className="text-lg font-bold text-teal-700 tabular-nums">
                {fmt(data.defaultAmount)}
              </span>
              <span className="text-xs text-teal-600">원</span>
              {data.defaultAmount === 0 && (
                <span className="text-xs text-gray-400 ml-1">(탭하여 설정)</span>
              )}
            </button>
          )}
        </div>

        {/* 수령 요약 (토글 가능) */}
        {data.entries.length > 0 && (
          <>
            <button
              onClick={() => setShowSummary((v) => !v)}
              className="flex items-center gap-1 text-xs text-teal-500 font-medium active:opacity-70 mb-2"
            >
              {showSummary ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              납부 현황 요약
            </button>
            {showSummary && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/70 rounded-xl px-3 py-2 text-center">
                  <div className="text-xs text-teal-600 font-medium mb-0.5">수령액</div>
                  <div className="text-sm font-bold text-teal-700 tabular-nums">
                    {fmt(totalCollected)}원
                  </div>
                  <div className="text-xs text-gray-400">{paidEntries.length}명</div>
                </div>
                <div className="bg-white/70 rounded-xl px-3 py-2 text-center">
                  <div className="text-xs text-red-400 font-medium mb-0.5">미납</div>
                  <div className="text-sm font-bold text-red-500 tabular-nums">
                    {fmt(totalExpected - totalCollected)}원
                  </div>
                  <div className="text-xs text-gray-400">{unpaidEntries.length}명</div>
                </div>
                <div className="bg-white/70 rounded-xl px-3 py-2 text-center">
                  <div className="text-xs text-gray-500 font-medium mb-0.5">전체</div>
                  <div className="text-sm font-bold text-gray-700 tabular-nums">
                    {fmt(totalExpected)}원
                  </div>
                  <div className="text-xs text-gray-400">{data.entries.length}명</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 명단 */}
      <ul className="divide-y divide-gray-50">
        {data.entries.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-gray-300">
            납부자를 추가하세요
          </li>
        )}
        {data.entries.map((entry) => {
          const displayAmount = entry.amount ?? data.defaultAmount
          return (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* 납부 토글 */}
                <button
                  onClick={() => handleToggle(entry.id)}
                  className={`flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    entry.paid
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300 active:border-teal-400'
                  }`}
                  aria-label={entry.paid ? '납부 취소' : '납부 완료'}
                >
                  {entry.paid && <Check size={13} className="text-white" />}
                </button>

                {/* 이름 + 메모 */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm block truncate ${
                      entry.paid ? 'line-through text-gray-300' : 'text-gray-800'
                    }`}
                  >
                    {entry.name}
                    {entry.name === nickname && (
                      <span className="ml-1.5 text-xs bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full">
                        나
                      </span>
                    )}
                  </span>
                  {entry.note && (
                    <span className="text-xs text-gray-400 block truncate">{entry.note}</span>
                  )}
                </div>

                {/* 금액 (개별 설정 가능) */}
                {editingEntryId === entry.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editingAmount}
                      onChange={(e) => setEditingEntryAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAmountOverrideSave(entry.id)
                        if (e.key === 'Escape') setEditingEntryId(null)
                      }}
                      onBlur={() => handleAmountOverrideSave(entry.id)}
                      className="w-20 text-sm text-right border border-teal-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500 tabular-nums"
                      autoFocus
                      min={0}
                    />
                    <span className="text-xs text-gray-400">원</span>
                  </div>
                ) : (
                  displayAmount > 0 && (
                    <button
                      onClick={() => {
                        setEditingEntryId(entry.id)
                        setEditingEntryAmount(String(entry.amount ?? data.defaultAmount))
                      }}
                      className={`text-sm font-medium tabular-nums flex-none ${
                        entry.paid ? 'text-gray-300' : 'text-gray-600'
                      } ${entry.amount !== undefined ? 'underline underline-offset-2 decoration-dashed' : ''}`}
                      title={entry.amount !== undefined ? '개별 금액 설정됨 (탭하여 수정)' : '탭하여 금액 수정'}
                    >
                      {fmt(displayAmount)}원
                    </button>
                  )
                )}

                {/* 삭제 */}
                <button
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="flex-none p-1.5 text-gray-200 hover:text-red-400 active:text-red-500 transition-colors rounded-lg"
                  aria-label="제거"
                >
                  <X size={13} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* 추가 영역 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        {isAddingEntry ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry() }}
              placeholder="이름 (여러 명은 쉼표로: 홍길동,김철수)"
              maxLength={20}
              autoFocus
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry() }}
              placeholder="비고 (예: 현금 납부, 분할 납부 등) — 선택"
              maxLength={30}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setIsAddingEntry(false); setNewName(''); setNewNote('') }}
                className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white active:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleAddEntry}
                disabled={!newName.trim()}
                className="flex-1 py-2 text-sm font-semibold text-white bg-teal-500 rounded-xl active:bg-teal-600 disabled:opacity-40"
              >
                추가
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-gray-300 flex-none" />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleAddEntry()
                }}
                placeholder="이름 입력 (여러 명은 쉼표로: 홍길동,김철수)"
                className="flex-1 text-sm text-gray-700 placeholder-gray-300 bg-transparent focus:outline-none"
                maxLength={20}
              />
              {newName.trim() && (
                <button
                  onClick={handleAddEntry}
                  className="text-xs font-semibold text-teal-500 active:text-teal-700 px-1"
                >
                  추가
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              {nickname && !data.entries.some((e) => e.name === nickname) && (
                <button
                  onClick={() =>
                    update({ entries: [...data.entries, { id: generateId(), name: nickname, paid: false }] })
                  }
                  className="text-xs text-blue-400 active:text-blue-600 font-medium"
                >
                  + 나({nickname}) 추가
                </button>
              )}
              {unaddedParticipants.length > 0 && (
                <button
                  onClick={addAllParticipants}
                  className="flex items-center gap-1 text-xs text-gray-400 active:text-gray-600"
                >
                  <Users size={11} />
                  참여자 전체 추가 ({unaddedParticipants.length}명)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
