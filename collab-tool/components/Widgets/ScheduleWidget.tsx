'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2, X, Check, AlignLeft, Users } from 'lucide-react'
import { generateId, getCurrentTimestamp } from '@/lib/utils'
import type { Widget, ScheduleData, ScheduleItem, ScheduleColor } from '@/types'

interface ScheduleWidgetProps {
  widget: Widget
  nickname?: string
  onUpdateData: (widgetId: string, data: ScheduleData) => Promise<boolean>
}

const COLOR_OPTIONS: { value: ScheduleColor; label: string; bg: string; text: string; bar: string }[] = [
  { value: 'blue',   label: '파랑', bg: 'bg-blue-100',   text: 'text-blue-800',   bar: 'bg-blue-400' },
  { value: 'green',  label: '초록', bg: 'bg-green-100',  text: 'text-green-800',  bar: 'bg-green-400' },
  { value: 'red',    label: '빨강', bg: 'bg-red-100',    text: 'text-red-800',    bar: 'bg-red-400' },
  { value: 'orange', label: '주황', bg: 'bg-orange-100', text: 'text-orange-800', bar: 'bg-orange-400' },
  { value: 'purple', label: '보라', bg: 'bg-purple-100', text: 'text-purple-800', bar: 'bg-purple-400' },
  { value: 'pink',   label: '분홍', bg: 'bg-pink-100',   text: 'text-pink-800',   bar: 'bg-pink-400' },
]

function getColorStyle(color?: ScheduleColor) {
  return COLOR_OPTIONS.find((c) => c.value === color) ?? COLOR_OPTIONS[0]
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatTimeRange(time?: string, endTime?: string) {
  if (!time) return ''
  if (!endTime) return time
  return `${time} ~ ${endTime}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface FormState {
  title: string
  date: string
  time: string
  endTime: string
  location: string
  memo: string
  color: ScheduleColor
}

const emptyForm = (date?: string): FormState => ({
  title: '',
  date: date ?? '',
  time: '',
  endTime: '',
  location: '',
  memo: '',
  color: 'blue',
})

export default function ScheduleWidget({ widget, nickname, onUpdateData }: ScheduleWidgetProps) {
  const data = widget.data as unknown as ScheduleData
  const items = data.items ?? []

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(
    toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  )
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const prevDays = new Date(viewYear, viewMonth, 0).getDate()
    const days: { day: number; month: 'prev' | 'cur' | 'next'; dateKey: string }[] = []

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i
      const m = viewMonth - 1
      const y = m < 0 ? viewYear - 1 : viewYear
      const realM = m < 0 ? 11 : m
      days.push({ day: d, month: 'prev', dateKey: toDateKey(y, realM, d) })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: 'cur', dateKey: toDateKey(viewYear, viewMonth, d) })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 1
      const y = m > 11 ? viewYear + 1 : viewYear
      const realM = m > 11 ? 0 : m
      days.push({ day: d, month: 'next', dateKey: toDateKey(y, realM, d) })
    }
    return days
  }, [viewYear, viewMonth])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    for (const item of items) {
      const sorted = map.get(item.date) ?? []
      sorted.push(item)
      map.set(item.date, sorted)
    }
    // 각 날짜의 일정을 시간순 정렬
    map.forEach((list, key) => {
      map.set(key, [...list].sort((a, b) => {
        if (!a.time && !b.time) return 0
        if (!a.time) return 1
        if (!b.time) return -1
        return a.time.localeCompare(b.time)
      }))
    })
    return map
  }, [items])

  const selectedItems = itemsByDate.get(selectedDate) ?? []
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  function openAddForm(dateKey: string) {
    setEditingItem(null)
    setForm(emptyForm(dateKey))
    setShowForm(true)
  }

  function openEditForm(item: ScheduleItem) {
    setEditingItem(item)
    setForm({
      title: item.title,
      date: item.date,
      time: item.time ?? '',
      endTime: item.endTime ?? '',
      location: item.location ?? '',
      memo: item.memo ?? '',
      color: item.color ?? 'blue',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    try {
      let newItems: ScheduleItem[]
      if (editingItem) {
        newItems = items.map((it) =>
          it.id === editingItem.id
            ? {
                ...it,
                title: form.title.trim(),
                date: form.date,
                time: form.time || undefined,
                endTime: form.endTime || undefined,
                location: form.location.trim() || undefined,
                memo: form.memo.trim() || undefined,
                color: form.color,
              }
            : it
        )
      } else {
        const newItem: ScheduleItem = {
          id: generateId(),
          title: form.title.trim(),
          date: form.date,
          time: form.time || undefined,
          endTime: form.endTime || undefined,
          location: form.location.trim() || undefined,
          memo: form.memo.trim() || undefined,
          participants: nickname ? [nickname] : [],
          color: form.color,
          created_at: getCurrentTimestamp(),
        }
        newItems = [...items, newItem]
      }
      const ok = await onUpdateData(widget.id, { items: newItems })
      if (ok) {
        setShowForm(false)
        setSelectedDate(form.date)
        // 저장한 날짜가 현재 뷰에 없으면 이동
        const [y, m] = form.date.split('-').map(Number)
        if (y !== viewYear || m !== viewMonth + 1) {
          setViewYear(y)
          setViewMonth(m - 1)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(itemId: string) {
    setDeletingId(itemId)
    try {
      await onUpdateData(widget.id, { items: items.filter((it) => it.id !== itemId) })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={prevMonth} className="p-2 text-gray-400 active:bg-gray-100 rounded-xl">
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(todayKey) }}
          className="text-base font-bold text-gray-900 active:text-blue-600"
        >
          {viewYear}년 {viewMonth + 1}월
        </button>
        <button onClick={nextMonth} className="p-2 text-gray-400 active:bg-gray-100 rounded-xl">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-semibold py-1.5 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 — 삼성 달력 스타일 */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {calendarDays.map((cell, idx) => {
          const isToday = cell.dateKey === todayKey
          const isSelected = cell.dateKey === selectedDate
          const isCur = cell.month === 'cur'
          const colIdx = idx % 7
          const cellItems = itemsByDate.get(cell.dateKey) ?? []
          const visibleItems = cellItems.slice(0, 2)
          const extraCount = cellItems.length - 2

          // 날짜 숫자 색상
          const dayTextColor = !isCur
            ? 'text-gray-300'
            : isToday
            ? 'text-white'
            : colIdx === 0
            ? 'text-red-400'
            : colIdx === 6
            ? 'text-blue-400'
            : 'text-gray-800'

          return (
            <button
              key={`${cell.dateKey}-${idx}`}
              onClick={() => { setSelectedDate(cell.dateKey) }}
              className={`flex flex-col items-center pt-1 pb-1 min-h-18 border-r border-b border-gray-50 last:border-r-0 transition-colors ${
                isSelected ? 'bg-blue-50' : 'active:bg-gray-50'
              } ${colIdx === 6 ? 'border-r-0' : ''}`}
            >
              {/* 날짜 숫자 */}
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold mb-0.5 ${
                  isToday ? 'bg-blue-500 text-white' : dayTextColor
                } ${isSelected && !isToday ? 'ring-2 ring-blue-400 ring-offset-0' : ''}`}
              >
                {cell.day}
              </span>

              {/* 일정 바 */}
              <div className="w-full px-0.5 space-y-0.5">
                {visibleItems.map((item) => {
                  const cs = getColorStyle(item.color)
                  return (
                    <div
                      key={item.id}
                      className={`w-full rounded-sm px-1 leading-3.25 truncate text-[9px] font-medium ${cs.bg} ${cs.text}`}
                    >
                      {item.time && <span className="opacity-70 mr-0.5">{item.time.slice(0, 5)}</span>}
                      {item.title}
                    </div>
                  )
                })}
                {extraCount > 0 && (
                  <div className="text-[9px] text-gray-400 font-medium px-1 leading-3.25">
                    +{extraCount}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* 선택된 날짜 일정 목록 */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-bold text-gray-800">
            {(() => {
              const [y, m, d] = selectedDate.split('-').map(Number)
              const dt = new Date(y, m - 1, d)
              const dayNames = ['일', '월', '화', '수', '목', '금', '토']
              const label = selectedDate === todayKey ? '오늘' : `${m}월 ${d}일 (${dayNames[dt.getDay()]})`
              return label
            })()}
            {selectedItems.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400 font-normal">{selectedItems.length}개</span>
            )}
          </p>
          <button
            onClick={() => openAddForm(selectedDate)}
            className="flex items-center gap-1 text-xs text-blue-500 font-semibold active:text-blue-700 py-1 px-2 rounded-lg active:bg-blue-50"
          >
            <Plus size={12} />
            일정 추가
          </button>
        </div>

        {selectedItems.length === 0 ? (
          <button
            onClick={() => openAddForm(selectedDate)}
            className="w-full flex flex-col items-center justify-center py-7 text-center rounded-xl border-2 border-dashed border-gray-100 active:border-blue-200 active:bg-blue-50 transition-colors"
          >
            <p className="text-sm text-gray-400">이 날엔 일정이 없어요</p>
            <p className="text-xs text-gray-300 mt-0.5">탭해서 추가하기</p>
          </button>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item) => {
              const cs = getColorStyle(item.color)
              return (
                <div
                  key={item.id}
                  className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-gray-100 cursor-pointer active:opacity-80"
                  onClick={() => openEditForm(item)}
                >
                  {/* 왼쪽 색상 바 */}
                  <div className={`w-1 flex-none ${cs.bar}`} />
                  <div className="flex-1 flex items-start gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</p>
                      {item.time && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={10} className="text-gray-400 flex-none" />
                          <span className="text-xs text-gray-500">{formatTimeRange(item.time, item.endTime)}</span>
                        </div>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-gray-400 flex-none" />
                          <span className="text-xs text-gray-500 truncate">{item.location}</span>
                        </div>
                      )}
                      {item.memo && (
                        <div className="flex items-start gap-1 mt-0.5">
                          <AlignLeft size={10} className="text-gray-400 flex-none mt-0.5" />
                          <span className="text-xs text-gray-500 line-clamp-1">{item.memo}</span>
                        </div>
                      )}
                      {item.participants.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users size={10} className="text-gray-400 flex-none" />
                          <span className="text-xs text-gray-400">{item.participants.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                      disabled={deletingId === item.id}
                      className="flex-none p-1 text-gray-300 active:text-red-400 transition-colors"
                      aria-label="삭제"
                    >
                      {deletingId === item.id ? (
                        <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 일정 추가/편집 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowForm(false)}>
          <div
            className="w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingItem ? '일정 수정' : '일정 추가'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 active:bg-gray-100 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* 색상 선택 — 상단에 노출 */}
              <div className="flex gap-2 justify-center">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                    className={`w-7 h-7 rounded-full ${c.bar} flex items-center justify-center transition-transform ${
                      form.color === c.value ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'opacity-50'
                    }`}
                  >
                    {form.color === c.value && <Check size={11} className="text-white" />}
                  </button>
                ))}
              </div>

              {/* 제목 */}
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="일정 제목 *"
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* 날짜 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">날짜 *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 시간 */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">시작</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">종료</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 장소 */}
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="장소 (선택)"
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* 메모 */}
              <textarea
                value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="메모 (선택)"
                maxLength={200}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              {/* 저장 */}
              <button
                disabled={!form.title.trim() || !form.date || saving}
                onClick={handleSave}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold text-base active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    저장 중...
                  </span>
                ) : editingItem ? '수정하기' : '추가하기'}
              </button>
              <div className="h-safe-bottom" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
