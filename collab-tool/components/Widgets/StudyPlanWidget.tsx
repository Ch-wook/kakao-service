'use client'

import { useState, useMemo } from 'react'
import { Trash2, Plus, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { generateId, getCurrentTimestamp } from '@/lib/utils'
import type { Widget, StudyPlanData, StudyLecture, StudyDailyLog } from '@/types'

type SubTab = 'dashboard' | 'calendar' | 'lectures'

interface Props {
  widget: Widget
  nickname?: string
  onUpdateData: (widgetId: string, data: StudyPlanData) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

// ── 날짜 유틸 ──
const formatDate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getToday = (): string => formatDate(new Date())

export default function StudyPlanWidget({ widget, nickname, onUpdateData, onDeleteWidget }: Props) {
  const data = widget.data as unknown as StudyPlanData
  const lectures = data.lectures || []
  const dailyLogs = data.dailyLogs || []
  const goalMinutes = data.goalMinutes || 180

  const [subTab, setSubTab] = useState<SubTab>('dashboard')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── 공통 헬퍼 ──
  const save = (patch: Partial<StudyPlanData>) =>
    onUpdateData(widget.id, { lectures, dailyLogs, goalMinutes, ...patch })

  // ────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-indigo-500" />
          <h3 className="font-bold text-sm text-gray-900">{widget.title || '학습계획표'}</h3>
        </div>
        <div className="flex items-center gap-1">
          {showDeleteConfirm ? (
            <>
              <button
                onClick={() => onDeleteWidget(widget.id)}
                className="text-xs text-red-500 font-semibold px-2 py-1"
              >
                삭제
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-400 px-2 py-1"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 서브 탭 */}
      <div className="flex border-b border-gray-100 px-2">
        {([
          { key: 'dashboard' as SubTab, label: '📊 대시보드' },
          { key: 'calendar' as SubTab, label: '📅 달력' },
          { key: 'lectures' as SubTab, label: '📚 강의' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 text-center py-2 text-xs font-medium border-b-2 transition-colors ${
              subTab === t.key
                ? 'text-indigo-600 border-indigo-500'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="px-4 py-3">
        {subTab === 'dashboard' && (
          <DashboardTab
            lectures={lectures}
            dailyLogs={dailyLogs}
            goalMinutes={goalMinutes}
            onSave={save}
          />
        )}
        {subTab === 'calendar' && (
          <CalendarTab dailyLogs={dailyLogs} lectures={lectures} />
        )}
        {subTab === 'lectures' && (
          <LecturesTab
            lectures={lectures}
            dailyLogs={dailyLogs}
            onSave={save}
          />
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// 대시보드 탭
// ════════════════════════════════════════════════
function DashboardTab({
  lectures,
  dailyLogs,
  goalMinutes,
  onSave,
}: {
  lectures: StudyLecture[]
  dailyLogs: StudyDailyLog[]
  goalMinutes: number
  onSave: (patch: Partial<StudyPlanData>) => Promise<boolean>
}) {
  const today = getToday()
  const [lectureId, setLectureId] = useState('')
  const [watched, setWatched] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [memo, setMemo] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // 오늘 로그
  const todayLogs = useMemo(() => dailyLogs.filter((l) => l.logDate === today), [dailyLogs, today])
  const totalMinutes = todayLogs.reduce((s, l) => s + l.studyMinutes, 0)
  const totalWatched = todayLogs.reduce((s, l) => s + l.watchedCount, 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const pct = Math.min(Math.round((totalMinutes / goalMinutes) * 100), 100)

  const handleSave = async () => {
    if (!lectureId) { setMsg('강의를 선택해 주세요.'); return }
    setSaving(true)
    setMsg('')

    // upsert: 같은 lectureId + 같은 날짜면 덮어쓰기
    const existIdx = dailyLogs.findIndex((l) => l.lectureId === lectureId && l.logDate === today)
    let updated: StudyDailyLog[]
    if (existIdx >= 0) {
      updated = dailyLogs.map((l, i) =>
        i === existIdx ? { ...l, watchedCount: watched, studyMinutes: minutes, memo: memo || undefined } : l
      )
    } else {
      updated = [
        ...dailyLogs,
        {
          id: generateId(),
          lectureId,
          logDate: today,
          watchedCount: watched,
          studyMinutes: minutes,
          memo: memo || undefined,
        },
      ]
    }

    const ok = await onSave({ dailyLogs: updated })
    setSaving(false)
    if (ok) {
      setMsg('저장 완료!')
      setLectureId('')
      setWatched(0)
      setMinutes(0)
      setMemo('')
    } else {
      setMsg('저장 실패')
    }
  }

  return (
    <div className="space-y-4">
      {/* 오늘의 진행도 */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 space-y-3">
        <h4 className="font-bold text-sm text-gray-800">오늘의 진행도</h4>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">총 학습 시간</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-500">{totalWatched}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">시청 강의 수</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>목표 {goalMinutes}분 달성률</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {todayLogs.length > 0 && (
          <ul className="space-y-1 pt-1">
            {todayLogs.map((log) => {
              const lec = lectures.find((l) => l.id === log.lectureId)
              return (
                <li key={log.id} className="flex justify-between text-xs text-gray-600 border-t border-white/50 pt-1.5">
                  <span className="truncate">{lec?.title || '삭제된 강의'}</span>
                  <span className="text-gray-400 flex-none ml-2">{log.watchedCount}강 · {log.studyMinutes}분</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 학습 기록 입력 */}
      {lectures.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-400">
          먼저 [📚 강의] 탭에서 강의를 추가해 주세요.
        </div>
      ) : (
        <div className="space-y-2.5">
          <h4 className="font-bold text-sm text-gray-800">학습 기록 입력</h4>
          <select
            className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={lectureId}
            onChange={(e) => setLectureId(e.target.value)}
          >
            <option value="">강의 선택</option>
            {lectures.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-0.5 block">시청 강의 수</label>
              <input
                type="number" min={0}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={watched}
                onChange={(e) => setWatched(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 mb-0.5 block">학습 시간 (분)</label>
              <input
                type="number" min={0}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <input
            type="text" placeholder="메모 (선택)"
            className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />

          {msg && (
            <p className={`text-[10px] ${msg.includes('실패') || msg.includes('선택') ? 'text-red-500' : 'text-emerald-500'}`}>
              {msg}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// 달력 탭
// ════════════════════════════════════════════════
function CalendarTab({
  dailyLogs,
  lectures,
}: {
  dailyLogs: StudyDailyLog[]
  lectures: StudyLecture[]
}) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const logDates = useMemo(() => new Set(dailyLogs.map((l) => l.logDate)), [dailyLogs])

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const today = getToday()
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11) }
    else setCurrentMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0) }
    else setCurrentMonth((m) => m + 1)
  }

  // 선택된 날짜의 로그
  const selectedLogs = useMemo(
    () => (selectedDate ? dailyLogs.filter((l) => l.logDate === selectedDate) : []),
    [dailyLogs, selectedDate]
  )
  const selTotalMinutes = selectedLogs.reduce((s, l) => s + l.studyMinutes, 0)
  const selTotalWatched = selectedLogs.reduce((s, l) => s + l.watchedCount, 0)

  return (
    <div className="space-y-3">
      {/* 월 이동 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h4 className="font-bold text-sm text-gray-800">
          {currentYear}년 {monthNames[currentMonth]}
        </h4>
        <button onClick={nextMonth} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7">
        {weekDays.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold py-0.5 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasLog = logDates.has(dateStr)
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const dayOfWeek = (firstDay + i) % 7

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
              className={`
                relative flex flex-col items-center justify-center rounded-lg py-1 text-xs transition-all
                ${isSelected ? 'bg-indigo-500 text-white font-bold shadow-sm' : ''}
                ${isToday && !isSelected ? 'bg-indigo-100 text-indigo-700 font-bold' : ''}
                ${!isToday && !isSelected ? 'hover:bg-gray-50' : ''}
                ${dayOfWeek === 0 && !isToday && !isSelected ? 'text-red-400' : ''}
                ${dayOfWeek === 6 && !isToday && !isSelected ? 'text-blue-400' : ''}
              `}
            >
              {day}
              {hasLog && (
                <span className={`mt-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : isToday ? 'bg-indigo-500' : 'bg-emerald-400'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* 선택된 날짜 상세 */}
      {selectedDate && (
        <div className="bg-indigo-50/50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center">
            <h5 className="font-bold text-xs text-gray-800">{selectedDate} 학습 기록</h5>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
          </div>
          {selectedLogs.length === 0 ? (
            <p className="text-[10px] text-gray-400">기록이 없습니다.</p>
          ) : (
            <>
              <div className="flex gap-3 text-center">
                <div className="flex-1 bg-white rounded-lg p-2">
                  <p className="font-bold text-sm text-indigo-600">{selTotalWatched}강</p>
                  <p className="text-[9px] text-gray-400">총 시청</p>
                </div>
                <div className="flex-1 bg-white rounded-lg p-2">
                  <p className="font-bold text-sm text-indigo-600">{selTotalMinutes}분</p>
                  <p className="text-[9px] text-gray-400">총 학습 시간</p>
                </div>
              </div>
              <ul className="space-y-1">
                {selectedLogs.map((log) => {
                  const lec = lectures.find((l) => l.id === log.lectureId)
                  return (
                    <li key={log.id} className="bg-white rounded-lg p-2">
                      <p className="font-semibold text-[11px] text-gray-800">{lec?.title || '삭제된 강의'}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {log.watchedCount}강 · {log.studyMinutes}분
                      </p>
                      {log.memo && <p className="text-[10px] text-gray-400 mt-0.5 italic">{log.memo}</p>}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// 강의 목록 탭
// ════════════════════════════════════════════════
function LecturesTab({
  lectures,
  dailyLogs,
  onSave,
}: {
  lectures: StudyLecture[]
  dailyLogs: StudyDailyLog[]
  onSave: (patch: Partial<StudyPlanData>) => Promise<boolean>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  // 강의별 진행률 계산
  const progressMap = useMemo(() => {
    const map: Record<string, { totalWatched: number; pct: number }> = {}
    for (const lec of lectures) {
      const totalWatched = dailyLogs
        .filter((l) => l.lectureId === lec.id)
        .reduce((s, l) => s + l.watchedCount, 0)
      const pct = lec.totalCount > 0 ? Math.round((totalWatched / lec.totalCount) * 100 * 10) / 10 : 0
      map[lec.id] = { totalWatched, pct }
    }
    return map
  }, [lectures, dailyLogs])

  const completed = lectures.filter((l) => (progressMap[l.id]?.pct ?? 0) >= 100).length

  const handleAdd = async () => {
    if (!title.trim()) { setAddError('강의명을 입력해 주세요.'); return }
    if (totalCount <= 0) { setAddError('전체 강의 수를 1 이상 입력해 주세요.'); return }
    setAdding(true)
    setAddError('')

    const newLecture: StudyLecture = {
      id: generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      totalCount,
      createdAt: getCurrentTimestamp(),
    }

    const ok = await onSave({ lectures: [...lectures, newLecture] })
    setAdding(false)
    if (ok) {
      setTitle('')
      setDescription('')
      setTotalCount(0)
      setShowAdd(false)
    } else {
      setAddError('저장 실패')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 강의를 삭제하면 관련 학습 기록도 모두 삭제됩니다. 계속할까요?')) return
    await onSave({
      lectures: lectures.filter((l) => l.id !== id),
      dailyLogs: dailyLogs.filter((l) => l.lectureId !== id),
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-400">총 {lectures.length}개 · 완료 {completed}개</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <Plus size={12} />
          추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <div className="bg-indigo-50/50 rounded-xl p-3 space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">강의명 *</label>
            <input
              type="text" placeholder="예) 알고리즘 기초"
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">설명 (선택)</label>
            <input
              type="text" placeholder="예) 코딩테스트 대비"
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">전체 강의 수 *</label>
            <input
              type="number" min={1} placeholder="0"
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={totalCount || ''}
              onChange={(e) => setTotalCount(Number(e.target.value))}
            />
          </div>
          {addError && <p className="text-[10px] text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {adding ? '추가 중...' : '추가'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddError('') }}
              className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 강의 카드 목록 */}
      {lectures.length === 0 ? (
        <div className="text-center py-6 text-xs text-gray-400">
          강의가 없습니다. 위 추가 버튼으로 등록해 보세요.
        </div>
      ) : (
        <div className="space-y-2">
          {lectures.map((lec) => {
            const prog = progressMap[lec.id] || { totalWatched: 0, pct: 0 }
            return (
              <div key={lec.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className="font-semibold text-xs text-gray-800 truncate">{lec.title}</h5>
                    {lec.description && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{lec.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(lec.id)}
                    className="text-gray-300 hover:text-red-400 text-[10px] transition-colors flex-none"
                  >
                    삭제
                  </button>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{prog.totalWatched} / {lec.totalCount}강 완료</span>
                  <span className={`font-semibold ${prog.pct >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {prog.pct}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${prog.pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(prog.pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
