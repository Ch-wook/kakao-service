'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useWidgets } from '@/hooks/useWidgets'
import SetNicknameModal from '@/components/Auth/SetNicknameModal'
import ChecklistWidget from '@/components/Widgets/ChecklistWidget'
import ExpenseWidget from '@/components/Widgets/ExpenseWidget'
import MemberWidget from '@/components/Widgets/MemberWidget'
import LedgerWidget from '@/components/Widgets/LedgerWidget'
import FeeWidget from '@/components/Widgets/FeeWidget'
import ScheduleWidget from '@/components/Widgets/ScheduleWidget'
import MemoWidget from '@/components/Widgets/MemoWidget'
import ImageGalleryWidget from '@/components/Widgets/ImageGalleryWidget'
import MusicPlayerWidget from '@/components/Widgets/MusicPlayerWidget'
import FileBoardWidget from '@/components/Widgets/FileBoardWidget'
import StudyPlanWidget from '@/components/Widgets/StudyPlanWidget'
import RetreatWidget from '@/components/Widgets/RetreatWidget'
import NoticeBanner, { NoticeAddBar } from '@/components/NoticeBanner'
import { Share2, Users, Plus, ArrowLeft, BookOpen, CalendarDays, X, LayoutGrid } from 'lucide-react'
import { generateShareUrl } from '@/lib/utils'
import type { Room, Participant } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableWidgetWrapper } from '@/components/Widgets/SortableWidgetWrapper'

type ActiveSection = 'widgets' | 'ledger' | 'schedule'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const { session, isLoading: authLoading, setNickname } = useAuth()

  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [addingWidgetType, setAddingWidgetType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [activeSection, setActiveSection] = useState<ActiveSection>('widgets')
  const [activeCustomTab, setActiveCustomTab] = useState<string | null>(null)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [addingTab, setAddingTab] = useState(false)
  const [newTabName, setNewTabName] = useState('')
  const [isCreatingLedger, setIsCreatingLedger] = useState(false)
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false)
  const ledgerInitRef = useRef(false)
  const scheduleInitRef = useRef(false)

  const {
    widgets,
    isLoading: widgetsLoading,
    error: widgetsError,
    tabs,
    createTab,
    deleteTab,
    setWidgetTab,
    createWidget,
    deleteWidget,
    addChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    updateExpenseData,
    togglePayerStatus,
    updateMemberData,
    toggleMemberStatus,
    updateLedgerData,
    updateFeeData,
    toggleFeeEntry,
    updateScheduleData,
    updateMemoData,
    upsertNotice,
    uploadImage,
    deleteImage,
    uploadTrack,
    deleteTrack,
    updateTrackName,
    uploadFile,
    deleteFile,
    updateWidgetOrder,
    updateStudyPlanData,
    updateRetreatData,
  } = useWidgets(roomId)

  // 닉네임 기준 유니크 참여자 수 (같은 사람이 여러 기기로 접속해도 1명으로 카운트)
  const uniqueParticipantCount = new Set(participants.map((p) => p.nickname)).size

  // 장부·일정·공지·탭설정 위젯 제외한 일반 위젯
  const ledgerWidget = widgets.find((w) => w.type === 'ledger')
  const scheduleWidget = widgets.find((w) => w.type === 'schedule')
  const noticeWidget = widgets.find((w) => w.type === 'notice')
  const noticeData = noticeWidget?.data as { content?: string; updated_at?: string; updated_by?: string } | undefined
  const WIDGET_TYPES = [
    { type: 'checklist',     label: '체크리스트', emoji: '✅' },
    { type: 'expense',       label: '정산',       emoji: '💰' },
    { type: 'member',        label: '멤버',       emoji: '👥' },
    { type: 'fee',           label: '납부',       emoji: '💳' },
    { type: 'memo',          label: '메모',       emoji: '📝' },
    { type: 'image-gallery', label: '갤러리',     emoji: '🖼️' },
    { type: 'music-player',  label: '음악',       emoji: '🎵' },
    { type: 'file-board',    label: '파일',       emoji: '📁' },
    { type: 'study-plan',    label: '학습',       emoji: '📚' },
    { type: 'retreat',       label: '성회',       emoji: '🏕️' },
  ] as const

  const displayWidgets = widgets.filter((w) => w.type !== 'ledger' && w.type !== 'schedule' && w.type !== 'tab-config' && w.type !== 'notice')
  const filteredWidgets = activeCustomTab !== null
    ? displayWidgets.filter((w) => w.tab_id === activeCustomTab)
    : displayWidgets

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = filteredWidgets.findIndex((w) => w.id === active.id)
      const newIndex = filteredWidgets.findIndex((w) => w.id === over.id)
      
      const newOrder = [...filteredWidgets]
      const [removed] = newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, removed)
      
      updateWidgetOrder(newOrder.map(w => w.id))
    }
  }, [filteredWidgets, updateWidgetOrder])

  // 방 정보 조회
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setIsLoadingRoom(true)
        const response = await fetch(`/api/rooms/${roomId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('방을 찾을 수 없습니다')
            setTimeout(() => router.push('/'), 3000)
          } else {
            setError('방 정보를 불러올 수 없습니다')
          }
          return
        }

        const data = await response.json()
        setRoom(data)
      } catch {
        setError('방 정보 조회 중 오류가 발생했습니다')
      } finally {
        setIsLoadingRoom(false)
      }
    }

    if (roomId) fetchRoom()
  }, [roomId, router])

  // 참여자 목록 조회
  const fetchParticipants = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (err) throw err
      setParticipants(data || [])
    } catch (err) {
      console.error('Error fetching participants:', err)
    }
  }, [roomId])

  // 참여자 Realtime 구독
  useEffect(() => {
    if (!roomId) return
    fetchParticipants()

    const channel = supabase
      .channel(`room-participants-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` },
        fetchParticipants
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [roomId, fetchParticipants])

  // 인증 완료 후 닉네임 확인 → 방 입장
  useEffect(() => {
    if (authLoading || !session.user || hasJoined) return

    if (session.nickname) {
      joinRoom(session.nickname)
    } else {
      setShowNicknameModal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user, authLoading, hasJoined])

  // 장부 탭 진입 시 ledger 위젯 자동 생성
  useEffect(() => {
    if (
      activeSection === 'ledger' &&
      !widgetsLoading &&
      !ledgerWidget &&
      !isCreatingLedger &&
      !ledgerInitRef.current
    ) {
      ledgerInitRef.current = true
      setIsCreatingLedger(true)
      createWidget('ledger', '회계 장부').finally(() => setIsCreatingLedger(false))
    }
  }, [activeSection, widgetsLoading, ledgerWidget, isCreatingLedger, createWidget])

  // 일정 탭 진입 시 schedule 위젯 자동 생성
  useEffect(() => {
    if (
      activeSection === 'schedule' &&
      !widgetsLoading &&
      !scheduleWidget &&
      !isCreatingSchedule &&
      !scheduleInitRef.current
    ) {
      scheduleInitRef.current = true
      setIsCreatingSchedule(true)
      createWidget('schedule', '일정').finally(() => setIsCreatingSchedule(false))
    }
  }, [activeSection, widgetsLoading, scheduleWidget, isCreatingSchedule, createWidget])

  const joinRoom = async (nickname: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '참여 실패')
      }

      const participant = await response.json()
      setCurrentParticipant(participant)
      setHasJoined(true)
    } catch (err) {
      console.error('joinRoom error:', err)
    }
  }

  const handleNicknameSet = async (nickname: string) => {
    setIsJoiningRoom(true)
    try {
      const success = setNickname(nickname)
      if (!success) { setError('닉네임 설정 실패'); return }
      await joinRoom(nickname)
      setShowNicknameModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '참여 중 오류가 발생했습니다')
    } finally {
      setIsJoiningRoom(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = generateShareUrl(roomId)

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    } catch {
      // clipboard API 실패 시 무시
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: room?.title || 'Collab 협업',
          text: `${room?.title || '협업'}에 참여하세요!`,
          url: shareUrl,
        })
      } catch {
        // 사용자가 공유 취소 - 무시
      }
    }

    if ('vibrate' in navigator) navigator.vibrate(50)
  }

  const handleToggle = async (widgetId: string, itemId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30)
    return toggleChecklistItem(widgetId, itemId)
  }

  const handleCreateWidget = async (type: Parameters<typeof createWidget>[0], title: string) => {
    const newWidget = await createWidget(type, title)
    if (newWidget && activeCustomTab) {
      await setWidgetTab(newWidget.id, activeCustomTab)
    }
    return newWidget
  }

  const handleCreateTab = async () => {
    const name = newTabName.trim()
    if (!name) { setAddingTab(false); return }
    const newTab = await createTab(name)
    setNewTabName('')
    setAddingTab(false)
    if (newTab) {
      setActiveSection('widgets')
      setActiveCustomTab(newTab.id)
    }
  }

  if (authLoading || isLoadingRoom) {
    return (
      <div className="h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3" />
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">😢</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">방을 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-500 mb-6">링크가 만료되었거나 잘못된 주소입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold"
          >
            홈으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Sticky Header ── */}
      <header className="flex-none bg-white border-b border-gray-100 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => router.back()}
              className="flex-none p-1.5 -ml-1 text-gray-500 active:bg-gray-100 rounded-xl"
              aria-label="뒤로가기"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate leading-tight text-sm">
                {room?.title || '협업'}
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Users size={9} />
                <span>{uniqueParticipantCount}명</span>
                {currentParticipant && (
                  <span className="text-blue-400">• {currentParticipant.nickname}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-none">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold active:bg-blue-100 transition-colors"
            >
              <Share2 size={13} />
              <span>{shareSuccess ? '복사됨!' : '공유'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 간소화 탭 바 ── */}
      <div className="flex-none flex items-center bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {/* 전체 탭 */}
        <button
          onClick={() => { setActiveSection('widgets'); setActiveCustomTab(null) }}
          className={`flex-none px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeSection === 'widgets' && activeCustomTab === null
              ? 'text-blue-600 border-blue-500'
              : 'text-gray-500 border-transparent'
          }`}
        >
          전체
        </button>

        {/* 커스텀 탭 */}
        {tabs.map((tab) => (
          <div key={tab.id} className="flex-none flex items-center">
            <button
              onClick={() => { setActiveSection('widgets'); setActiveCustomTab(tab.id) }}
              className={`px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSection === 'widgets' && activeCustomTab === tab.id
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-500 border-transparent'
              }`}
            >
              {tab.name}
            </button>
            <button
              onClick={() => {
                if (activeCustomTab === tab.id) setActiveCustomTab(null)
                deleteTab(tab.id)
              }}
              className="p-1 -ml-1.5 mr-1 text-gray-200 hover:text-red-400 active:text-red-500 transition-colors"
              aria-label={`${tab.name} 탭 삭제`}
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* 일정 탭 */}
        <button
          onClick={() => { setActiveSection('schedule') }}
          className={`flex-none flex items-center gap-1 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeSection === 'schedule'
              ? 'text-emerald-600 border-emerald-500'
              : 'text-gray-500 border-transparent'
          }`}
        >
          <CalendarDays size={13} />
          일정
        </button>

        {/* 장부 탭 */}
        <button
          onClick={() => { setActiveSection('ledger') }}
          className={`flex-none flex items-center gap-1 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeSection === 'ledger'
              ? 'text-violet-600 border-violet-500'
              : 'text-gray-500 border-transparent'
          }`}
        >
          <BookOpen size={13} />
          장부
        </button>

        {/* 구분선 */}
        <div className="flex-none w-px h-4 bg-gray-200 my-2 mx-1" />

        {/* 커스텀 탭 추가 */}
        {addingTab ? (
          <div className="flex-none flex items-center px-2 gap-1">
            <input
              autoFocus
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTab()
                if (e.key === 'Escape') { setAddingTab(false); setNewTabName('') }
              }}
              onBlur={() => { if (!newTabName.trim()) { setAddingTab(false) } }}
              placeholder="탭 이름"
              maxLength={10}
              className="w-20 text-sm px-2 py-1 border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); handleCreateTab() }}
              className="text-xs text-blue-500 font-semibold px-1"
            >
              확인
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingTab(true)}
            className="flex-none px-2.5 py-2.5 text-gray-300 active:text-blue-400 hover:text-gray-400 transition-colors"
            aria-label="그룹 탭 추가"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* ── 공지 배너 — widgets 탭일 때만 표시 ── */}
      {activeSection === 'widgets' && (
        noticeData?.content ? (
          <NoticeBanner
            content={noticeData.content}
            updatedBy={noticeData.updated_by}
            updatedAt={noticeData.updated_at}
            nickname={session.nickname ?? undefined}
            onSave={upsertNotice}
            onDelete={async () => noticeWidget ? deleteWidget(noticeWidget.id) : false}
          />
        ) : (
          <NoticeAddBar
            nickname={session.nickname ?? undefined}
            onAdd={upsertNotice}
          />
        )
      )}


      {/* ── 위젯 탭 ── */}
      {activeSection === 'widgets' && (
        <>
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-3 py-3 space-y-2.5 pb-6">
              {(error || widgetsError) && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  {error || widgetsError}
                </div>
              )}

              {widgetsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-gray-200 rounded-full" />
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-full" />
                        <div className="h-3 bg-gray-100 rounded w-4/5" />
                        <div className="h-3 bg-gray-100 rounded w-3/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredWidgets.length === 0 ? (
                /* 전체/커스텀 탭 + 위젯 없음 */
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                    <LayoutGrid size={22} className="text-blue-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {activeCustomTab ? '이 탭에 위젯이 없어요' : '아직 위젯이 없어요'}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    아래 + 버튼으로 위젯을 추가해보세요
                  </p>
                  <button
                    onClick={() => setShowWidgetPicker(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl text-sm font-semibold active:bg-blue-600 shadow-md shadow-blue-100"
                  >
                    <Plus size={16} />
                    위젯 추가
                  </button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredWidgets.map((w) => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredWidgets.map((widget) => {
                      let content = null
                      if (widget.type === 'checklist') {
                        content = (
                          <ChecklistWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onToggle={handleToggle}
                            onAdd={addChecklistItem}
                            onUpdate={updateChecklistItem}
                            onDelete={deleteChecklistItem}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'expense') {
                        content = (
                          <ExpenseWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            participants={participants.map((p) => p.nickname)}
                            onUpdateData={updateExpenseData}
                            onTogglePayer={togglePayerStatus}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'member') {
                        content = (
                          <MemberWidget
                            widget={widget}
                            onUpdateData={updateMemberData}
                            onToggleStatus={toggleMemberStatus}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'fee') {
                        content = (
                          <FeeWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            participants={participants.map((p) => p.nickname)}
                            onUpdateData={updateFeeData}
                            onToggleEntry={toggleFeeEntry}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'memo') {
                        content = (
                          <MemoWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onUpdateData={updateMemoData}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'image-gallery') {
                        content = (
                          <ImageGalleryWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onUploadImage={uploadImage}
                            onDeleteImage={deleteImage}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'music-player') {
                        content = (
                          <MusicPlayerWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onUploadTrack={uploadTrack}
                            onDeleteTrack={deleteTrack}
                            onUpdateTrackName={updateTrackName}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'file-board') {
                        content = (
                          <FileBoardWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onUploadFile={uploadFile}
                            onDeleteFile={deleteFile}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'study-plan') {
                        content = (
                          <StudyPlanWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onUpdateData={updateStudyPlanData}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else if (widget.type === 'retreat') {
                        content = (
                          <RetreatWidget
                            widget={widget}
                            nickname={session.nickname ?? undefined}
                            onUpdateData={updateRetreatData}
                            onDeleteWidget={deleteWidget}
                          />
                        )
                      } else {
                        content = (
                          <div className="bg-white rounded-2xl border border-gray-100 p-4 opacity-60">
                            <p className="text-sm text-gray-400">
                              {widget.title || widget.type} (준비 중)
                            </p>
                          </div>
                        )
                      }

                      return (
                        <SortableWidgetWrapper key={widget.id} id={widget.id}>
                          {content}
                        </SortableWidgetWrapper>
                      )
                    })}
                  </SortableContext>
                </DndContext>
              )}

              {/* 하단 위젯 추가 FAB */}
              {!widgetsLoading && (
                <button
                  onClick={() => setShowWidgetPicker(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-medium active:border-blue-300 active:text-blue-500 transition-colors"
                >
                  <Plus size={15} />
                  위젯 추가
                </button>
              )}
            </div>
          </main>

        </>
      )}

      {/* ── 일정 탭 ── */}
      {activeSection === 'schedule' && (
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 py-3 pb-6">
            {isCreatingSchedule || (widgetsLoading && !scheduleWidget) ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full mb-3" />
                <p className="text-sm text-gray-400">일정 불러오는 중...</p>
              </div>
            ) : scheduleWidget ? (
              <ScheduleWidget
                widget={scheduleWidget}
                nickname={session.nickname ?? undefined}
                onUpdateData={updateScheduleData}
              />
            ) : null}
          </div>
        </main>
      )}

      {/* ── 장부 탭 ── */}
      {activeSection === 'ledger' && (
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 py-3 pb-6">
            {isCreatingLedger || (widgetsLoading && !ledgerWidget) ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full mb-3" />
                <p className="text-sm text-gray-400">장부 불러오는 중...</p>
              </div>
            ) : ledgerWidget ? (
              <LedgerWidget
                widget={ledgerWidget}
                onUpdateData={updateLedgerData}
              />
            ) : null}
          </div>
        </main>
      )}

      {/* 위젯 추가 팝업 */}
      {showWidgetPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowWidgetPicker(false)}>
          {/* 배경 딤 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          {/* 바텀 시트 */}
          <div
            className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900">위젯 추가</h3>
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WIDGET_TYPES.map((opt) => (
                <button
                  key={opt.type}
                  disabled={!!addingWidgetType}
                  onClick={async () => {
                    setAddingWidgetType(opt.type)
                    await handleCreateWidget(opt.type, opt.label)
                    setAddingWidgetType(null)
                    setShowWidgetPicker(false)
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 ${
                    addingWidgetType === opt.type
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                  } disabled:opacity-50`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs font-medium text-gray-700">{opt.label}</span>
                  {addingWidgetType === opt.type && (
                    <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 닉네임 모달 */}
      <SetNicknameModal
        isOpen={showNicknameModal}
        onNicknameSet={handleNicknameSet}
        isLoading={isJoiningRoom}
      />

    </div>
  )
}
