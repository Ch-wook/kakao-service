'use client'

import { useState, useMemo } from 'react'
import { Trash2, Plus, ChevronDown, ChevronUp, MapPin, Calendar, Church, Check, X, Edit2, Save } from 'lucide-react'
import { generateId } from '@/lib/utils'
import type { Widget, RetreatData, RetreatMember, RetreatVisitation } from '@/types'

type SubTab = 'overview' | 'members' | 'timeslots' | 'visitation'

interface Props {
  widget: Widget
  nickname?: string
  onUpdateData: (widgetId: string, data: RetreatData) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

const STATUS_LABEL: Record<RetreatMember['registrationStatus'], string> = {
  none: '미등록', pre: '가등록', confirmed: '선등록',
}
const STATUS_COLOR: Record<RetreatMember['registrationStatus'], string> = {
  none: 'bg-gray-200 text-gray-600',
  pre: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
}
const NEXT_STATUS: Record<RetreatMember['registrationStatus'], RetreatMember['registrationStatus']> = {
  none: 'pre', pre: 'confirmed', confirmed: 'none',
}

export default function RetreatWidget({ widget, onUpdateData, onDeleteWidget }: Props) {
  const data = widget.data as unknown as RetreatData
  const members = data.members || []
  const timeSlots = data.timeSlots || []
  const visitations = data.visitations || []

  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const save = (patch: Partial<RetreatData>) =>
    onUpdateData(widget.id, { ...data, ...patch })

  // D-Day 계산
  const dDay = useMemo(() => {
    if (!data.startDate) return null
    const today = new Date(); today.setHours(0,0,0,0)
    const start = new Date(data.startDate + 'T00:00:00'); start.setHours(0,0,0,0)
    return Math.ceil((start.getTime() - today.getTime()) / 86400000)
  }, [data.startDate])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <Church size={15} className="text-purple-500" />
          <h3 className="font-bold text-sm text-gray-900">{widget.title || '성회'}</h3>
          {dDay !== null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              dDay <= 0 ? 'bg-red-100 text-red-600' : dDay <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'
            }`}>
              {dDay === 0 ? 'D-Day' : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showDeleteConfirm ? (
            <>
              <button onClick={() => onDeleteWidget(widget.id)} className="text-xs text-red-500 font-semibold px-2 py-1">삭제</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-400 px-2 py-1">취소</button>
            </>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 서브 탭 */}
      <div className="flex border-b border-gray-100 px-2">
        {([
          { key: 'overview' as SubTab, label: '📋 개요' },
          { key: 'members' as SubTab, label: '👥 명단' },
          { key: 'timeslots' as SubTab, label: '⏰ 타임' },
          { key: 'visitation' as SubTab, label: '🏠 심방' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 text-center py-2 text-xs font-medium border-b-2 transition-colors ${
              subTab === t.key ? 'text-purple-600 border-purple-500' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        {subTab === 'overview' && <OverviewTab data={data} members={members} timeSlots={timeSlots} dDay={dDay} onSave={save} />}
        {subTab === 'members' && <MembersTab members={members} onSave={save} />}
        {subTab === 'timeslots' && <TimeSlotsTab members={members} timeSlots={timeSlots} onSave={save} />}
        {subTab === 'visitation' && <VisitationTab members={members} visitations={visitations} onSave={save} />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// 개요 탭
// ════════════════════════════════════════════════
function OverviewTab({ data, members, timeSlots, dDay, onSave }: {
  data: RetreatData; members: RetreatMember[]; timeSlots: RetreatData['timeSlots']; dDay: number | null;
  onSave: (patch: Partial<RetreatData>) => Promise<boolean>
}) {
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [newGoal, setNewGoal] = useState(data.totalGoal.toString())

  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editInfo, setEditInfo] = useState({
    eventTitle: data.eventTitle || '',
    eventSubtitle: data.eventSubtitle || '',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    location: data.location || ''
  })

  const regCounts = useMemo(() => {
    const c = { none: 0, pre: 0, confirmed: 0 }
    members.forEach(m => c[m.registrationStatus]++)
    return c
  }, [members])
  const totalReg = regCounts.pre + regCounts.confirmed
  const regPct = members.length > 0 && data.totalGoal > 0 ? Math.round((totalReg / data.totalGoal) * 100) : 0

  const handleSaveGoal = () => {
    const goal = parseInt(newGoal, 10)
    if (!isNaN(goal) && goal >= 0) {
      onSave({ totalGoal: goal })
    }
    setIsEditingGoal(false)
  }

  return (
    <div className="space-y-4">
      {/* 이벤트 정보 카드 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 space-y-2 relative group">
        {!isEditingInfo ? (
          <>
            <button onClick={() => setIsEditingInfo(true)} className="absolute top-3 right-3 p-1.5 bg-white/50 hover:bg-white text-purple-600 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100">
              <Edit2 size={12} />
            </button>
            <h4 className="font-bold text-base text-gray-900 pr-6">{data.eventTitle}</h4>
            <p className="text-xs text-purple-600 font-medium">{data.eventSubtitle}</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
              <Calendar size={12} />
              <span>{data.startDate?.replace(/-/g, '.')} ~ {data.endDate?.replace(/-/g, '.')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin size={12} />
              <span>{data.location}</span>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <input type="text" placeholder="행사 제목" value={editInfo.eventTitle} onChange={e => setEditInfo({...editInfo, eventTitle: e.target.value})}
              className="w-full font-bold text-sm border-b border-purple-200 bg-transparent px-1 py-0.5 focus:outline-none focus:border-purple-400" />
            <input type="text" placeholder="부제목" value={editInfo.eventSubtitle} onChange={e => setEditInfo({...editInfo, eventSubtitle: e.target.value})}
              className="w-full text-xs text-purple-600 font-medium border-b border-purple-200 bg-transparent px-1 py-0.5 focus:outline-none focus:border-purple-400" />
            
            <div className="flex items-center gap-2 mt-2">
              <Calendar size={12} className="text-gray-500" />
              <input type="date" value={editInfo.startDate} onChange={e => setEditInfo({...editInfo, startDate: e.target.value})}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white" />
              <span className="text-[10px] text-gray-400">~</span>
              <input type="date" value={editInfo.endDate} onChange={e => setEditInfo({...editInfo, endDate: e.target.value})}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white" />
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-gray-500" />
              <input type="text" placeholder="장소" value={editInfo.location} onChange={e => setEditInfo({...editInfo, location: e.target.value})}
                className="flex-1 text-xs border-b border-purple-200 bg-transparent px-1 py-0.5 focus:outline-none focus:border-purple-400" />
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <button onClick={() => setIsEditingInfo(false)} className="text-[10px] px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">취소</button>
              <button onClick={() => { onSave(editInfo); setIsEditingInfo(false) }} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-purple-500 text-white hover:bg-purple-600 rounded">
                <Save size={10} /> 저장
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-purple-600">
            {dDay === null ? '-' : dDay === 0 ? 'D-Day' : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">디데이</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{members.length}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">현재 인원</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center flex flex-col justify-center items-center relative group">
          {isEditingGoal ? (
            <div className="flex items-center gap-1">
              <input type="number" min={0} value={newGoal} onChange={e => setNewGoal(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                className="w-12 text-center text-lg font-bold text-emerald-600 bg-white border border-emerald-200 rounded px-1 py-0.5 outline-none" autoFocus />
              <button onClick={handleSaveGoal} className="text-[10px] bg-emerald-500 text-white px-1.5 py-1 rounded"><Check size={10}/></button>
            </div>
          ) : (
            <div onClick={() => setIsEditingGoal(true)} className="cursor-pointer">
              <p className="text-xl font-bold text-emerald-600 group-hover:underline decoration-emerald-300">{data.totalGoal}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">목표 인원</p>
            </div>
          )}
        </div>
      </div>

      {/* 등록 현황 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-gray-700">등록 현황</span>
          <span className="text-gray-500">{totalReg}/{data.totalGoal}명 ({regPct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(regPct, 100)}%` }} />
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="text-gray-500">미등록 <strong className="text-gray-700">{regCounts.none}</strong></span>
          <span className="text-amber-600">가등록 <strong>{regCounts.pre}</strong></span>
          <span className="text-emerald-600">선등록 <strong>{regCounts.confirmed}</strong></span>
        </div>
      </div>

      {/* 타임별 참석 요약 */}
      <div className="space-y-2">
        <h5 className="font-semibold text-xs text-gray-700">타임별 참석 인원</h5>
        <div className="grid grid-cols-2 gap-1.5">
          {timeSlots.map((ts) => (
            <div key={ts.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-600">{ts.label}</span>
              <span className="text-xs font-bold text-purple-600">{ts.attendeeIds.length}명</span>
            </div>
          ))}
          {timeSlots.length === 0 && <span className="text-[10px] text-gray-400 col-span-2 text-center py-2">등록된 타임이 없습니다.</span>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// 명단 탭
// ════════════════════════════════════════════════
function MembersTab({ members, onSave }: {
  members: RetreatMember[]; onSave: (patch: Partial<RetreatData>) => Promise<boolean>
}) {
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupNum, setNewGroupNum] = useState<number>(1)
  const [addingToGroup, setAddingToGroup] = useState<number | null>(null)
  const [newNames, setNewNames] = useState('')

  const groups = useMemo(() => {
    const map = new Map<number, RetreatMember[]>()
    members.forEach(m => {
      if (!map.has(m.group)) map.set(m.group, [])
      map.get(m.group)!.push(m)
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [members])

  const regCounts = useMemo(() => {
    const c = { none: 0, pre: 0, confirmed: 0 }
    members.forEach(m => c[m.registrationStatus]++)
    return c
  }, [members])

  const handleToggle = (memberId: string) => {
    const updated = members.map(m =>
      m.id === memberId ? { ...m, registrationStatus: NEXT_STATUS[m.registrationStatus] } : m
    )
    onSave({ members: updated })
  }

  const handleDelete = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('정말 삭제하시겠습니까?')) return
    onSave({ members: members.filter(m => m.id !== memberId) })
  }

  const handleAddMembers = (group: number) => {
    const names = newNames.split(',').map(n => n.trim()).filter(Boolean)
    if (names.length === 0) return
    const newMembers = names.map(name => ({
      id: generateId(), name, group, registrationStatus: 'none' as const
    }))
    onSave({ members: [...members, ...newMembers] })
    setNewNames('')
    setAddingToGroup(null)
  }

  const handleCreateGroup = () => {
    if (!newGroupNum) return
    // 방어코드: 이미 해당 순이 있는지 확인 (없을 때만 추가하는 로직은 딱히 필요없음, 빈 순이라도 UI상 띄워주기 위해선 members 데이터에 뭔가가 있어야 하는데, RetreatMember 배열 구조상 그룹 정보만 저장할 순 없음. 
    // 그냥 입력란만 열어주고 바로 첫 멤버를 추가하도록 유도하는게 낫다)
    setShowAddGroup(false)
    setAddingToGroup(newGroupNum)
  }

  // 그룹 목록에 없는 "새로운 순"을 추가하려고 할 때를 대비해 가상 그룹들을 포함시킴
  const displayGroups = [...groups]
  if (addingToGroup !== null && !groups.find(g => g[0] === addingToGroup)) {
    displayGroups.push([addingToGroup, []])
    displayGroups.sort((a, b) => a[0] - b[0])
  }

  return (
    <div className="space-y-3">
      {/* 요약 및 순 추가 버튼 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">미등록 {regCounts.none}</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">가등록 {regCounts.pre}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">선등록 {regCounts.confirmed}</span>
        </div>
        <button onClick={() => setShowAddGroup(!showAddGroup)}
          className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors">
          <Plus size={12} /> 순 추가
        </button>
      </div>

      {showAddGroup && (
        <div className="flex gap-2 items-center bg-purple-50 p-2 rounded-xl border border-purple-100">
          <input type="number" min={1} placeholder="순 번호" value={newGroupNum} onChange={e => setNewGroupNum(Number(e.target.value))}
            className="w-16 border border-gray-200 rounded-lg p-1.5 text-xs bg-white text-center" />
          <span className="text-xs text-gray-600">순</span>
          <button onClick={handleCreateGroup} className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg font-medium">생성</button>
          <button onClick={() => setShowAddGroup(false)} className="px-2 py-1.5 text-gray-400 text-xs">취소</button>
        </div>
      )}

      {members.length === 0 && !addingToGroup && !showAddGroup && (
        <div className="text-center py-6 text-xs text-gray-400">등록된 명단이 없습니다. 순을 추가해주세요.</div>
      )}

      {/* 순별 목록 */}
      {displayGroups.map(([groupNum, groupMembers]) => (
        <div key={groupNum} className="mb-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1.5">
            <h5 className="text-[11px] font-bold text-gray-500">{groupNum}순 ({groupMembers.length}명)</h5>
            <button onClick={() => setAddingToGroup(groupNum)} className="text-[10px] text-purple-500 font-medium hover:text-purple-600">
              + 인원 추가
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-1 mb-2">
            {groupMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => handleToggle(m.id)}
                className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors relative"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs text-gray-800 truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[m.registrationStatus]}`}>
                    {STATUS_LABEL[m.registrationStatus]}
                  </span>
                  <div 
                    onClick={(e) => handleDelete(m.id, e)}
                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors md:opacity-0 group-hover:opacity-100"
                  >
                    <X size={10} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {addingToGroup === groupNum && (
            <div className="flex items-center gap-2 mt-1 px-1">
              <input type="text" placeholder="이름 (쉼표로 구분하여 여러명 추가 가능)" value={newNames} 
                onChange={(e) => setNewNames(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddMembers(groupNum) }}
                autoFocus
                className="flex-1 border border-gray-200 rounded-lg p-1.5 text-xs bg-gray-50 focus:bg-white" />
              <button onClick={() => handleAddMembers(groupNum)} className="px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg">확인</button>
              <button onClick={() => setAddingToGroup(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={14}/></button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════
// 타임별 탭
// ════════════════════════════════════════════════
function TimeSlotsTab({ members, timeSlots, onSave }: {
  members: RetreatMember[]; timeSlots: RetreatData['timeSlots']; onSave: (patch: Partial<RetreatData>) => Promise<boolean>
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [newSlotLabel, setNewSlotLabel] = useState('')

  const groups = useMemo(() => {
    const map = new Map<number, RetreatMember[]>()
    members.forEach(m => {
      if (!map.has(m.group)) map.set(m.group, [])
      map.get(m.group)!.push(m)
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [members])

  const handleToggleAttendee = (slotId: string, memberId: string) => {
    const updated = timeSlots.map(ts => {
      if (ts.id !== slotId) return ts
      const has = ts.attendeeIds.includes(memberId)
      return { ...ts, attendeeIds: has ? ts.attendeeIds.filter(id => id !== memberId) : [...ts.attendeeIds, memberId] }
    })
    onSave({ timeSlots: updated })
  }

  const handleAddSlot = () => {
    if (!newSlotLabel.trim()) return
    const newTs = { id: generateId(), label: newSlotLabel.trim(), attendeeIds: [] }
    onSave({ timeSlots: [...timeSlots, newTs] })
    setNewSlotLabel('')
    setShowAddSlot(false)
  }

  const handleDeleteSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('이 타임을 삭제하시겠습니까?')) return
    onSave({ timeSlots: timeSlots.filter(ts => ts.id !== slotId) })
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-1">
        <button onClick={() => setShowAddSlot(!showAddSlot)} className="flex items-center gap-1 text-[10px] text-purple-600 font-semibold px-2 py-1 bg-purple-50 rounded-lg">
          <Plus size={12} /> 타임 추가
        </button>
      </div>

      {showAddSlot && (
        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl mb-2 border border-gray-100">
          <input type="text" placeholder="타임 이름 (예: 월요일 저녁)" value={newSlotLabel} onChange={e => setNewSlotLabel(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg p-1.5 text-xs bg-white" />
          <button onClick={handleAddSlot} className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg font-medium">추가</button>
          <button onClick={() => setShowAddSlot(false)} className="px-2 py-1.5 text-gray-400 text-xs">취소</button>
        </div>
      )}

      {timeSlots.length === 0 && !showAddSlot && (
        <div className="text-center py-6 text-xs text-gray-400">등록된 타임이 없습니다.</div>
      )}

      {timeSlots.map((ts) => {
        const isExpanded = expandedId === ts.id
        const pct = members.length > 0 ? Math.round((ts.attendeeIds.length / members.length) * 100) : 0
        return (
          <div key={ts.id} className="border border-gray-100 rounded-xl overflow-hidden group">
            <button
              onClick={() => setExpandedId(isExpanded ? null : ts.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800">{ts.label}</span>
                <span className="text-[10px] text-purple-600 font-semibold">{ts.attendeeIds.length}/{members.length}명</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-purple-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div onClick={e => handleDeleteSlot(ts.id, e)} className="md:opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1">
                  <Trash2 size={12} />
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-gray-400 ml-1" /> : <ChevronDown size={14} className="text-gray-400 ml-1" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-2">
                {groups.map(([groupNum, groupMembers]) => (
                  <div key={groupNum}>
                    <p className="text-[10px] font-bold text-gray-400 mb-1">{groupNum}순</p>
                    <div className="flex flex-wrap gap-1">
                      {groupMembers.map((m) => {
                        const isIn = ts.attendeeIds.includes(m.id)
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleToggleAttendee(ts.id, m.id)}
                            className={`text-[11px] px-2 py-1 rounded-lg border transition-all active:scale-95 ${
                              isIn
                                ? 'bg-purple-500 text-white border-purple-500'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            {m.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════
// 심방 탭
// ════════════════════════════════════════════════
function VisitationTab({ members, visitations, onSave }: {
  members: RetreatMember[]; visitations: RetreatVisitation[]; onSave: (patch: Partial<RetreatData>) => Promise<boolean>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [selName, setSelName] = useState('')
  const [selDate, setSelDate] = useState('')
  const [selMemo, setSelMemo] = useState('')

  const handleAdd = () => {
    if (!selName || !selDate) return
    const newV: RetreatVisitation = {
      id: generateId(), memberName: selName, date: selDate, status: 'planned', memo: selMemo || undefined,
    }
    onSave({ visitations: [...visitations, newV] })
    setSelName(''); setSelDate(''); setSelMemo(''); setShowAdd(false)
  }

  const handleToggle = (id: string) => {
    const updated = visitations.map(v =>
      v.id === id ? { ...v, status: (v.status === 'planned' ? 'completed' : 'planned') as 'planned' | 'completed' } : v
    )
    onSave({ visitations: updated })
  }

  const handleDelete = (id: string) => {
    onSave({ visitations: visitations.filter(v => v.id !== id) })
  }

  const planned = visitations.filter(v => v.status === 'planned')
  const completed = visitations.filter(v => v.status === 'completed')

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-400">예정 {planned.length} · 완료 {completed.length}</p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors">
          <Plus size={12} /> 추가
        </button>
      </div>

      {showAdd && (
        <div className="bg-purple-50/50 rounded-xl p-3 space-y-2">
          <select value={selName} onChange={(e) => setSelName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
            <option value="">대상 선택</option>
            {members.map(m => <option key={m.id} value={m.name}>{m.name} ({m.group}순)</option>)}
          </select>
          <input type="date" value={selDate} onChange={(e) => setSelDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-300" />
          <input type="text" placeholder="메모 (선택)" value={selMemo} onChange={(e) => setSelMemo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-300" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg py-2 text-xs font-semibold transition-colors">추가</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
          </div>
        </div>
      )}

      {visitations.length === 0 && !showAdd && (
        <div className="text-center py-6 text-xs text-gray-400">심방 일정이 없습니다.</div>
      )}

      {visitations.map(v => (
        <div key={v.id} className={`rounded-xl p-3 border ${v.status === 'completed' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-xs text-gray-800">{v.memberName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{v.date}</p>
              {v.memo && <p className="text-[10px] text-gray-500 mt-0.5 italic">{v.memo}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleToggle(v.id)}
                className={`p-1 rounded-lg transition-colors ${v.status === 'completed' ? 'text-emerald-500 bg-emerald-100' : 'text-gray-400 bg-gray-100 hover:bg-purple-100 hover:text-purple-500'}`}>
                <Check size={12} />
              </button>
              <button onClick={() => handleDelete(v.id)} className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
