'use client'

import { useState, useMemo } from 'react'
import { BookOpen, Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Widget, LedgerData, LedgerEntry, LedgerEntryType } from '@/types'
import { generateId } from '@/lib/utils'

interface LedgerWidgetProps {
  widget: Widget
  onUpdateData: (widgetId: string, data: LedgerData) => Promise<boolean>
  onDeleteWidget?: (widgetId: string) => Promise<boolean>
}

const CATEGORIES = ['식비', '교통비', '숙박비', '입장료', '쇼핑', '기타']

const CATEGORY_COLOR: Record<string, string> = {
  식비: 'bg-orange-100 text-orange-700',
  교통비: 'bg-sky-100 text-sky-700',
  숙박비: 'bg-purple-100 text-purple-700',
  입장료: 'bg-green-100 text-green-700',
  쇼핑: 'bg-pink-100 text-pink-700',
  기타: 'bg-gray-100 text-gray-500',
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

function categoryColor(cat: string) {
  return CATEGORY_COLOR[cat] ?? 'bg-gray-100 text-gray-500'
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()} (${DAY_KO[d.getDay()]})`
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR')
}

const DEFAULT_FORM = {
  date: '',
  category: '식비',
  customCategory: '',
  description: '',
  amount: '',
  type: 'expense' as LedgerEntryType,
}

export default function LedgerWidget({ widget, onUpdateData, onDeleteWidget }: LedgerWidgetProps) {
  const raw = widget.data as unknown as Partial<LedgerData>
  const data: LedgerData = { entries: raw.entries ?? [] }

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ ...DEFAULT_FORM, date: now.toISOString().slice(0, 10) })
  const [isSaving, setIsSaving] = useState(false)

  const monthEntries = useMemo(() => {
    return data.entries
      .filter((e) => {
        const d = new Date(e.date + 'T00:00:00')
        return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.entries, viewYear, viewMonth])

  const totalIncome = monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = monthEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const balance = totalIncome - totalExpense

  const grouped = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>()
    for (const e of monthEntries) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthEntries])

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1) }
    else setViewMonth((m) => m + 1)
  }
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1

  const handleAdd = async () => {
    const category = form.category === '직접입력' ? form.customCategory.trim() : form.category
    const amount = parseInt(form.amount.replace(/[^0-9]/g, ''), 10)
    if (!category || isNaN(amount) || amount <= 0 || !form.description.trim() || !form.date) return

    const newEntry: LedgerEntry = {
      id: generateId(),
      date: form.date,
      category,
      description: form.description.trim(),
      amount,
      type: form.type,
    }

    setIsSaving(true)
    try {
      const success = await onUpdateData(widget.id, { entries: [...data.entries, newEntry] })
      if (success) {
        setIsAdding(false)
        setForm({ ...DEFAULT_FORM, date: form.date })
        // 추가한 항목이 속한 달로 뷰 이동
        const d = new Date(form.date + 'T00:00:00')
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth() + 1)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (id: string) =>
    onUpdateData(widget.id, { entries: data.entries.filter((e) => e.id !== id) })

  const totalEntries = data.entries.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen size={17} className="text-violet-500 flex-none" />
          <h3 className="font-semibold text-gray-900 text-sm">{widget.title || '회계 장부'}</h3>
          {totalEntries > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              총 {totalEntries}건
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

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-violet-50 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 text-violet-400 active:text-violet-700 rounded-lg">
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth() + 1) }}
          className={`text-sm font-bold transition-colors ${isCurrentMonth ? 'text-violet-700' : 'text-gray-600 active:text-violet-700'}`}
        >
          {viewYear}년 {viewMonth}월
          {isCurrentMonth && <span className="ml-1.5 text-xs font-normal text-violet-400">이번 달</span>}
        </button>
        <button onClick={nextMonth} className="p-1.5 text-violet-400 active:text-violet-700 rounded-lg">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 월 요약 */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-3 py-3 text-center">
          <div className="text-xs text-sky-500 font-medium mb-0.5">수입</div>
          <div className="text-sm font-bold text-sky-600 tabular-nums">{fmt(totalIncome)}원</div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="text-xs text-red-400 font-medium mb-0.5">지출</div>
          <div className="text-sm font-bold text-red-500 tabular-nums">{fmt(totalExpense)}원</div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="text-xs text-gray-400 font-medium mb-0.5">수지</div>
          <div className={`text-sm font-bold tabular-nums ${balance >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
            {balance > 0 ? '+' : ''}{fmt(balance)}원
          </div>
        </div>
      </div>

      {/* 항목 목록 */}
      <div className="divide-y divide-gray-50 min-h-[60px]">
        {grouped.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-300">
            이달 기록이 없어요
          </div>
        ) : (
          grouped.map(([date, entries]) => (
            <div key={date}>
              {/* 날짜 소제목 */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50">
                <span className="text-xs font-semibold text-gray-400">{formatDay(date)}</span>
                <span className={`text-xs tabular-nums font-medium ${
                  entries.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0) >= 0
                    ? 'text-sky-500'
                    : 'text-red-400'
                }`}>
                  {(() => {
                    const net = entries.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0)
                    return `${net > 0 ? '+' : ''}${fmt(net)}원`
                  })()}
                </span>
              </div>

              {/* 항목 행 */}
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className={`flex-none text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(entry.category)}`}>
                    {entry.category}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{entry.description}</span>
                  <span className={`flex-none text-sm font-semibold tabular-nums ${
                    entry.type === 'income' ? 'text-sky-600' : 'text-gray-800'
                  }`}>
                    {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}원
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="flex-none p-1 text-gray-200 hover:text-red-400 active:text-red-500 transition-colors rounded"
                    aria-label="삭제"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* 추가 폼 */}
      {isAdding ? (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
          {/* 지출 / 수입 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                form.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-400'
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: 'income' }))}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                form.type === 'income' ? 'bg-sky-500 text-white' : 'text-gray-400'
              }`}
            >
              수입
            </button>
          </div>

          {/* 날짜 */}
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          {/* 카테고리 */}
          <div className="flex flex-wrap gap-1.5">
            {[...CATEGORIES, '직접입력'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: cat }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.category === cat
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'border-gray-200 text-gray-500 bg-white active:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {form.category === '직접입력' && (
            <input
              type="text"
              value={form.customCategory}
              onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
              placeholder="카테고리 이름"
              maxLength={20}
              autoFocus
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          )}

          {/* 내용 */}
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="내용 (예: 저녁 회식)"
            maxLength={50}
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          {/* 금액 */}
          <div className="relative">
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              placeholder="금액"
              min={0}
              className="w-full text-sm px-3 py-2.5 pr-8 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setIsAdding(false); setForm({ ...DEFAULT_FORM, date: form.date }) }}
              className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white active:bg-gray-100"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={isSaving}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-violet-500 rounded-xl active:bg-violet-600 disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '추가'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-violet-500 active:opacity-60"
          >
            <Plus size={15} />
            항목 추가
          </button>
        </div>
      )}
    </div>
  )
}
