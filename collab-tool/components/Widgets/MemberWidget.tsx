'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Users, X } from 'lucide-react'
import type { Widget, MemberData, MemberStatus } from '@/types'
import { generateId } from '@/lib/utils'

interface MemberWidgetProps {
  widget: Widget
  onUpdateData: (widgetId: string, data: MemberData) => Promise<boolean>
  onToggleStatus: (widgetId: string, groupId: string, memberId: string) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

const STATUS_CONFIG: Record<MemberStatus, { label: string; textColor: string; bgColor: string }> = {
  unknown:   { label: '미확인', textColor: 'text-gray-500',   bgColor: 'bg-gray-100' },
  attending: { label: '참석',   textColor: 'text-green-700',  bgColor: 'bg-green-100' },
  arrived:   { label: '도착',   textColor: 'text-blue-700',   bgColor: 'bg-blue-100' },
  preparing: { label: '준비중', textColor: 'text-amber-700',  bgColor: 'bg-amber-100' },
  absent:    { label: '불참',   textColor: 'text-red-600',    bgColor: 'bg-red-100' },
  home:      { label: '가정',   textColor: 'text-purple-700', bgColor: 'bg-purple-100' },
}

export default function MemberWidget({
  widget,
  onUpdateData,
  onToggleStatus,
  onDeleteWidget,
}: MemberWidgetProps) {
  const data = widget.data as unknown as MemberData
  const groups = data.groups ?? []

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingMember, setEditingMember] = useState<{ groupId: string; memberId: string; name: string } | null>(null)
  const [editingNote, setEditingNote] = useState<{ groupId: string; memberId: string; note: string } | null>(null)

  const totalMembers = groups.reduce((sum, g) => sum + g.members.length, 0)
  const attendingCount = groups.reduce(
    (sum, g) =>
      sum + g.members.filter((m) => m.status === 'attending' || m.status === 'arrived').length,
    0
  )

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleAddMember = async (groupId: string) => {
    const names = newMemberName.split(',').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) return
    const group = groups.find((g) => g.id === groupId)
    const existing = group?.members.map((m) => m.name) ?? []
    const newOnes = names.filter((n) => !existing.includes(n))
    if (newOnes.length === 0) return
    const updatedGroups = groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            members: [
              ...g.members,
              ...newOnes.map((name) => ({ id: generateId(), name, status: 'unknown' as MemberStatus })),
            ],
          }
    )
    await onUpdateData(widget.id, { groups: updatedGroups })
    setNewMemberName('')
    setAddingMemberGroupId(null)
  }

  const handleEditMemberName = async (groupId: string, memberId: string, newName: string) => {
    const name = newName.trim()
    if (!name) { setEditingMember(null); return }
    const updatedGroups = groups.map((g) =>
      g.id !== groupId ? g : { ...g, members: g.members.map((m) => m.id !== memberId ? m : { ...m, name }) }
    )
    await onUpdateData(widget.id, { groups: updatedGroups })
    setEditingMember(null)
  }

  const handleEditMemberNote = async (groupId: string, memberId: string, note: string) => {
    const updatedGroups = groups.map((g) =>
      g.id !== groupId ? g : {
        ...g,
        members: g.members.map((m) =>
          m.id !== memberId ? m : { ...m, note: note.trim() || undefined }
        ),
      }
    )
    await onUpdateData(widget.id, { groups: updatedGroups })
    setEditingNote(null)
  }

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    const updatedGroups = groups.map((g) =>
      g.id !== groupId ? g : { ...g, members: g.members.filter((m) => m.id !== memberId) }
    )
    await onUpdateData(widget.id, { groups: updatedGroups })
  }

  const handleAddGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    const newGroup = { id: generateId(), name, targetCount: 0, members: [] }
    await onUpdateData(widget.id, { groups: [...groups, newGroup] })
    setNewGroupName('')
    setAddingGroup(false)
  }

  const handleRemoveGroup = async (groupId: string) => {
    await onUpdateData(widget.id, { groups: groups.filter((g) => g.id !== groupId) })
  }

  const handleDeleteWidget = async () => {
    setIsDeleting(true)
    await onDeleteWidget(widget.id)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Users size={15} className="text-indigo-500 flex-none" />
          <span className="font-semibold text-gray-900 text-sm truncate">
            {widget.title || '인원 관리'}
          </span>
          <span className="flex-none text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
            참석 {attendingCount}/{totalMembers}명
          </span>
        </div>
        <button
          onClick={handleDeleteWidget}
          disabled={isDeleting}
          className="flex-none p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 rounded-lg transition-colors"
          aria-label="위젯 삭제"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* 그룹 목록 */}
      <div className="divide-y divide-gray-50">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id)
          const gAttending = group.members.filter(
            (m) => m.status === 'attending' || m.status === 'arrived'
          ).length
          const gTotal = group.members.length

          return (
            <div key={group.id}>
              {/* 그룹 헤더 */}
              <div className="flex items-center gap-1 px-4 py-2 bg-gray-50">
                <button
                  onClick={() => toggleCollapse(group.id)}
                  className="flex items-center gap-1.5 flex-1 text-left min-w-0"
                >
                  {isCollapsed
                    ? <ChevronRight size={13} className="text-gray-400 flex-none" />
                    : <ChevronDown size={13} className="text-gray-400 flex-none" />
                  }
                  <span className="text-sm font-semibold text-gray-700 truncate">{group.name}</span>
                  <span className="flex-none text-xs text-gray-400 ml-1">
                    {gAttending}/{gTotal}명
                    {group.targetCount ? `/${group.targetCount}` : ''}
                  </span>
                </button>
                <button
                  onClick={() => handleRemoveGroup(group.id)}
                  className="flex-none p-1 text-gray-300 hover:text-red-400 rounded transition-colors"
                  aria-label="그룹 삭제"
                >
                  <X size={13} />
                </button>
              </div>

              {/* 멤버 목록 */}
              {!isCollapsed && (
                <div>
                  {group.members.map((member) => {
                    const cfg = STATUS_CONFIG[member.status ?? 'unknown']
                    return (
                      <div key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                        <button
                          onClick={() => onToggleStatus(widget.id, group.id, member.id)}
                          className={`flex-none px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors active:opacity-70 ${cfg.bgColor} ${cfg.textColor}`}
                        >
                          {cfg.label}
                        </button>
                        {/* 이름 + 메모 */}
                        <div className="flex-1 min-w-0">
                          {editingMember?.groupId === group.id && editingMember.memberId === member.id ? (
                            <input
                              type="text"
                              value={editingMember.name}
                              onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditMemberName(group.id, member.id, editingMember.name)
                                if (e.key === 'Escape') setEditingMember(null)
                              }}
                              onBlur={() => handleEditMemberName(group.id, member.id, editingMember.name)}
                              autoFocus
                              className="w-full text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                            />
                          ) : (
                            <span
                              className="text-sm text-gray-800 cursor-pointer hover:text-blue-600 block truncate"
                              onClick={() => setEditingMember({ groupId: group.id, memberId: member.id, name: member.name })}
                            >
                              {member.name}
                            </span>
                          )}
                          {/* 메모 (도착시간 등) */}
                          {editingNote?.groupId === group.id && editingNote.memberId === member.id ? (
                            <input
                              type="text"
                              value={editingNote.note}
                              onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditMemberNote(group.id, member.id, editingNote.note)
                                if (e.key === 'Escape') setEditingNote(null)
                              }}
                              onBlur={() => handleEditMemberNote(group.id, member.id, editingNote.note)}
                              autoFocus
                              placeholder="메모 입력 (예: 9:30 도착)"
                              maxLength={30}
                              className="w-full text-xs px-2 py-0.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white mt-0.5"
                            />
                          ) : (
                            <span
                              className="text-xs text-gray-400 block truncate cursor-pointer hover:text-blue-400 mt-0.5"
                              onClick={() => setEditingNote({ groupId: group.id, memberId: member.id, note: member.note ?? '' })}
                            >
                              {member.note || <span className="text-gray-200">+ 메모</span>}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveMember(group.id, member.id)}
                          className="flex-none p-1 text-gray-200 hover:text-gray-400 rounded transition-colors"
                          aria-label="멤버 삭제"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })}

                  {/* 멤버 추가 인풋 */}
                  {addingMemberGroupId === group.id ? (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddMember(group.id)
                          if (e.key === 'Escape') {
                            setAddingMemberGroupId(null)
                            setNewMemberName('')
                          }
                        }}
                        placeholder="이름 입력 (여러 명은 쉼표로: 홍길동,김철수)"
                        autoFocus
                        className="flex-1 text-sm px-3 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                      <button
                        onClick={() => handleAddMember(group.id)}
                        className="flex-none px-3 py-2 bg-blue-500 text-white rounded-xl text-xs font-semibold active:bg-blue-600"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => { setAddingMemberGroupId(null); setNewMemberName('') }}
                        className="flex-none p-2 text-gray-400 hover:text-gray-600 rounded-xl"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingMemberGroupId(group.id)
                        setNewMemberName('')
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-blue-500 active:text-blue-600 w-full text-left transition-colors"
                    >
                      <Plus size={14} />
                      <span>이름 추가</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 그룹 추가 */}
      <div className="px-4 py-3 border-t border-gray-50">
        {addingGroup ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddGroup()
                if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
              }}
              placeholder="그룹명 입력"
              autoFocus
              className="flex-1 text-sm px-3 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
            />
            <button
              onClick={handleAddGroup}
              className="flex-none px-3 py-2 bg-blue-500 text-white rounded-xl text-xs font-semibold active:bg-blue-600"
            >
              추가
            </button>
            <button
              onClick={() => { setAddingGroup(false); setNewGroupName('') }}
              className="flex-none p-2 text-gray-400 hover:text-gray-600 rounded-xl"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="flex items-center gap-2 text-sm text-blue-500 font-medium py-1 active:opacity-70 transition-opacity"
          >
            <Plus size={15} />
            <span>그룹 추가</span>
          </button>
        )}
      </div>
    </div>
  )
}
