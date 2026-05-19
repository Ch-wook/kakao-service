'use client'

import { useState } from 'react'
import { Wallet, Plus, Trash2, Check, X, Users } from 'lucide-react'
import type { Widget, ExpenseData, ExpensePayer } from '@/types'

interface ExpenseWidgetProps {
  widget: Widget
  nickname?: string
  participants?: string[]
  onUpdateData: (widgetId: string, data: ExpenseData) => Promise<boolean>
  onTogglePayer: (widgetId: string, payerName: string) => Promise<boolean>
  onDeleteWidget?: (widgetId: string) => Promise<boolean>
}

export default function ExpenseWidget({
  widget,
  nickname,
  participants = [],
  onUpdateData,
  onTogglePayer,
  onDeleteWidget,
}: ExpenseWidgetProps) {
  const raw = widget.data as unknown as Partial<ExpenseData>
  const data: ExpenseData = {
    totalAmount: raw.totalAmount ?? 0,
    description: raw.description ?? '',
    payers: raw.payers ?? [],
  }

  const [isEditingAmount, setIsEditingAmount] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [newPayerName, setNewPayerName] = useState('')
  const [isAddingPayer, setIsAddingPayer] = useState(false)
  const [editingPayerAmount, setEditingPayerAmount] = useState<{ name: string; value: string } | null>(null)

  const paidCount = data.payers.filter((p) => p.paid).length
  const perPerson =
    data.payers.length > 0 && data.totalAmount > 0
      ? Math.ceil(data.totalAmount / data.payers.length)
      : 0

  const totalCollected = data.payers
    .filter((p) => p.paid)
    .reduce((sum, p) => sum + (p.paidAmount ?? perPerson), 0)
  const remaining = Math.max(0, data.totalAmount - totalCollected)

  const fmt = (n: number) => n.toLocaleString('ko-KR')

  const update = (patch: Partial<ExpenseData>) =>
    onUpdateData(widget.id, { ...data, ...patch })

  // ── 금액 편집 ──
  const handleAmountSave = async () => {
    const amount = parseInt(editAmount.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(amount) && amount >= 0) await update({ totalAmount: amount })
    setIsEditingAmount(false)
  }

  // ── 설명 편집 ──
  const handleDescSave = async () => {
    await update({ description: editDesc.trim() })
    setIsEditingDesc(false)
  }

  // ── 납부 토글 ──
  const handleToggle = async (name: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30)
    await onTogglePayer(widget.id, name)
  }

  // ── 개인 납부액 편집 ──
  const handlePayerAmountSave = async (name: string, valueStr: string) => {
    const amount = parseInt(valueStr.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(amount) && amount >= 0) {
      await update({
        payers: data.payers.map((p) =>
          p.name !== name ? p : { ...p, paidAmount: amount }
        ),
      })
    }
    setEditingPayerAmount(null)
  }

  // ── 납부자 추가 ──
  const addPayer = async (name: string) => {
    if (!name.trim() || data.payers.some((p) => p.name === name)) return
    setIsAddingPayer(true)
    try {
      await update({ payers: [...data.payers, { name, paid: false }] })
      setNewPayerName('')
    } finally {
      setIsAddingPayer(false)
    }
  }

  // ── 납부자 제거 ──
  const removePayer = (name: string) =>
    update({ payers: data.payers.filter((p) => p.name !== name) })

  // ── 참여자 전체 추가 ──
  const addAllParticipants = async () => {
    const newPayers: ExpensePayer[] = participants
      .filter((name) => !data.payers.some((p) => p.name === name))
      .map((name) => ({ name, paid: false }))
    if (newPayers.length > 0) {
      await update({ payers: [...data.payers, ...newPayers] })
    }
  }

  const unaddedParticipants = participants.filter(
    (name) => !data.payers.some((p) => p.name === name)
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Wallet size={17} className="text-emerald-500 flex-none" />
          <h3 className="font-semibold text-gray-900 text-sm">
            {widget.title || '정산'}
          </h3>
          {data.payers.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {paidCount}/{data.payers.length}명 납부
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
      {data.payers.length > 0 && (
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(paidCount / data.payers.length) * 100}%` }}
          />
        </div>
      )}

      {/* 금액 섹션 */}
      <div className="px-4 py-4 bg-emerald-50 border-b border-gray-100">
        {/* 총 금액 */}
        {isEditingAmount ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAmountSave()
                if (e.key === 'Escape') setIsEditingAmount(false)
              }}
              onBlur={handleAmountSave}
              className="flex-1 text-2xl font-bold text-gray-900 bg-white border border-emerald-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              placeholder="0"
              min={0}
            />
            <button
              onClick={handleAmountSave}
              className="p-2 text-emerald-600 active:bg-emerald-100 rounded-xl"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => setIsEditingAmount(false)}
              className="p-2 text-gray-400 active:bg-gray-100 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditAmount(String(data.totalAmount))
              setIsEditingAmount(true)
            }}
            className="flex items-baseline gap-1 active:opacity-70"
          >
            <span className="text-2xl font-bold text-gray-900">{fmt(data.totalAmount)}</span>
            <span className="text-sm text-gray-500">원</span>
            <span className="text-xs text-gray-400 ml-1">(탭하여 수정)</span>
          </button>
        )}

        {/* 설명 */}
        {isEditingDesc ? (
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDescSave()
                if (e.key === 'Escape') setIsEditingDesc(false)
              }}
              onBlur={handleDescSave}
              className="flex-1 text-xs border border-emerald-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
              placeholder="어디에 쓴 돈인가요?"
              maxLength={50}
            />
            <button onClick={handleDescSave} className="p-1 text-emerald-600">
              <Check size={13} />
            </button>
            <button onClick={() => setIsEditingDesc(false)} className="p-1 text-gray-400">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditDesc(data.description)
              setIsEditingDesc(true)
            }}
            className="mt-1 text-xs text-gray-400 active:opacity-70 text-left"
          >
            {data.description || '+ 내용 입력 (예: 저녁 회식)'}
          </button>
        )}

        {/* 1인당 금액 */}
        {perPerson > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-100 flex items-baseline gap-1">
            <span className="text-xs text-emerald-600 font-medium">1인당</span>
            <span className="text-lg font-bold text-emerald-700">{fmt(perPerson)}</span>
            <span className="text-xs text-emerald-600">원</span>
            {data.totalAmount % data.payers.length !== 0 && (
              <span className="text-xs text-gray-400 ml-1">(올림 적용)</span>
            )}
          </div>
        )}

        {/* 납부 현황 요약 */}
        {data.payers.length > 0 && data.totalAmount > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <div className="text-xs text-emerald-600 font-medium mb-0.5">납부 완료</div>
              <div className="text-sm font-bold text-emerald-700 tabular-nums">
                {fmt(totalCollected)}원
              </div>
              <div className="text-xs text-gray-400">{paidCount}명</div>
            </div>
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <div className="text-xs text-red-400 font-medium mb-0.5">미납</div>
              <div className="text-sm font-bold text-red-500 tabular-nums">
                {fmt(remaining)}원
              </div>
              <div className="text-xs text-gray-400">{data.payers.length - paidCount}명</div>
            </div>
          </div>
        )}
      </div>

      {/* 납부자 목록 */}
      <ul className="divide-y divide-gray-50">
        {data.payers.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-gray-300">
            납부할 사람을 추가하세요
          </li>
        )}
        {data.payers.map((payer) => (
          <li key={payer.name} className="flex items-center gap-3 px-4 py-3">
            {/* 납부 토글 버튼 */}
            <button
              onClick={() => handleToggle(payer.name)}
              className={`flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                payer.paid
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-gray-300 active:border-emerald-400'
              }`}
              aria-label={payer.paid ? '납부 취소' : '납부 완료'}
            >
              {payer.paid && <Check size={13} className="text-white" />}
            </button>

            {/* 이름 */}
            <span
              className={`flex-1 text-sm ${
                payer.paid ? 'line-through text-gray-300' : 'text-gray-800'
              }`}
            >
              {payer.name}
              {payer.name === nickname && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full">
                  나
                </span>
              )}
            </span>

            {/* 납부 금액 (납부 완료 시 편집 가능, 미납 시 회색 표시) */}
            {perPerson > 0 && (
              payer.paid ? (
                editingPayerAmount?.name === payer.name ? (
                  <input
                    type="number"
                    value={editingPayerAmount.value}
                    onChange={(e) =>
                      setEditingPayerAmount({ ...editingPayerAmount, value: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        handlePayerAmountSave(payer.name, editingPayerAmount.value)
                      if (e.key === 'Escape') setEditingPayerAmount(null)
                    }}
                    onBlur={() =>
                      handlePayerAmountSave(payer.name, editingPayerAmount.value)
                    }
                    className="w-24 text-sm text-right border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                    autoFocus
                    min={0}
                  />
                ) : (
                  <button
                    onClick={() =>
                      setEditingPayerAmount({
                        name: payer.name,
                        value: String(payer.paidAmount ?? perPerson),
                      })
                    }
                    className="text-sm font-semibold tabular-nums text-emerald-600 active:opacity-60 underline-offset-2 hover:underline"
                    title="탭하여 금액 수정"
                  >
                    {fmt(payer.paidAmount ?? perPerson)}원
                  </button>
                )
              ) : (
                <span className="text-sm tabular-nums text-gray-300">
                  {fmt(perPerson)}원
                </span>
              )
            )}

            {/* 삭제 버튼 */}
            <button
              onClick={() => removePayer(payer.name)}
              className="p-1.5 text-gray-200 hover:text-red-400 active:text-red-500 transition-colors rounded-lg"
              aria-label="제거"
            >
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>

      {/* 납부자 추가 영역 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-gray-300 flex-none" />
          <input
            type="text"
            value={newPayerName}
            onChange={(e) => setNewPayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addPayer(newPayerName)
            }}
            placeholder="이름 입력 후 Enter..."
            disabled={isAddingPayer}
            className="flex-1 text-sm text-gray-700 placeholder-gray-300 bg-transparent focus:outline-none disabled:opacity-50"
            maxLength={20}
          />
          {newPayerName.trim() && (
            <button
              onClick={() => addPayer(newPayerName)}
              disabled={isAddingPayer}
              className="text-xs font-semibold text-emerald-500 active:text-emerald-700 disabled:opacity-50 px-1"
            >
              추가
            </button>
          )}
        </div>

        {/* 빠른 추가: 현재 사용자 */}
        {nickname && !data.payers.some((p) => p.name === nickname) && (
          <button
            onClick={() => addPayer(nickname)}
            className="mt-2 text-xs text-blue-400 active:text-blue-600 font-medium"
          >
            + 나({nickname}) 추가
          </button>
        )}

        {/* 빠른 추가: 참여자 전체 */}
        {unaddedParticipants.length > 0 && (
          <button
            onClick={addAllParticipants}
            className="mt-2 ml-3 flex items-center gap-1 text-xs text-gray-400 active:text-gray-600"
          >
            <Users size={11} />
            참여자 전체 추가 ({unaddedParticipants.length}명)
          </button>
        )}
      </div>
    </div>
  )
}
