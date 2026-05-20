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
import AddWidgetDrawer from '@/components/Widgets/AddWidgetDrawer'
import { Share2, Users, Plus, ArrowLeft, BookOpen, X } from 'lucide-react'
import { generateShareUrl } from '@/lib/utils'
import type { Room, Participant } from '@/types'

type ActiveSection = 'widgets' | 'ledger'

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
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [activeSection, setActiveSection] = useState<ActiveSection>('widgets')
  const [activeCustomTab, setActiveCustomTab] = useState<string | null>(null)
  const [addingTab, setAddingTab] = useState(false)
  const [newTabName, setNewTabName] = useState('')
  const [isCreatingLedger, setIsCreatingLedger] = useState(false)
  const ledgerInitRef = useRef(false)

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
  } = useWidgets(roomId)

  // 장부·탭설정 위젯 제외한 일반 위젯
  const ledgerWidget = widgets.find((w) => w.type === 'ledger')
  const displayWidgets = widgets.filter((w) => w.type !== 'ledger' && w.type !== 'tab-config')
  const filteredWidgets = activeCustomTab === null
    ? displayWidgets
    : displayWidgets.filter((w) => w.tab_id === activeCustomTab)

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
      <header className="flex-none bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.back()}
              className="flex-none p-2 -ml-2 text-gray-500 active:bg-gray-100 rounded-xl"
              aria-label="뒤로가기"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate leading-tight">
                {room?.title || '협업'}
              </h1>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Users size={10} />
                <span>{participants.length}명 참여 중</span>
                {currentParticipant && (
                  <span className="text-blue-400">• {currentParticipant.nickname}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex-none flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium active:bg-blue-100 transition-colors"
          >
            <Share2 size={14} />
            <span>{shareSuccess ? '복사됨!' : '공유'}</span>
          </button>
        </div>
      </header>

      {/* ── 탭 바 ── */}
      <div className="flex-none flex bg-white border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {/* 전체 탭 */}
        <button
          onClick={() => { setActiveSection('widgets'); setActiveCustomTab(null) }}
          className={`flex-none px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeSection === 'widgets' && activeCustomTab === null
              ? 'text-blue-600 border-blue-500'
              : 'text-gray-400 border-transparent'
          }`}
        >
          전체
        </button>

        {/* 커스텀 탭 */}
        {tabs.map((tab) => (
          <div key={tab.id} className="flex-none flex items-center group">
            <button
              onClick={() => { setActiveSection('widgets'); setActiveCustomTab(tab.id) }}
              className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeSection === 'widgets' && activeCustomTab === tab.id
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-400 border-transparent'
              }`}
            >
              {tab.name}
            </button>
            <button
              onClick={() => {
                if (activeCustomTab === tab.id) setActiveCustomTab(null)
                deleteTab(tab.id)
              }}
              className="p-1 -ml-1 text-gray-200 hover:text-red-400 active:text-red-500 transition-colors"
              aria-label={`${tab.name} 탭 삭제`}
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {/* 탭 추가 */}
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
            className="flex-none px-3 py-2.5 text-gray-300 hover:text-blue-400 active:text-blue-500 transition-colors"
            aria-label="탭 추가"
          >
            <Plus size={15} />
          </button>
        )}

        {/* 장부 탭 — 오른쪽 끝 */}
        <div className="flex-1" />
        <button
          onClick={() => setActiveSection('ledger')}
          className={`flex-none flex items-center gap-1 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeSection === 'ledger'
              ? 'text-violet-600 border-violet-500'
              : 'text-gray-400 border-transparent'
          }`}
        >
          <BookOpen size={13} />
          장부
        </button>
      </div>

      {/* ── 위젯 탭 ── */}
      {activeSection === 'widgets' && (
        <>
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 space-y-3 pb-6">
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
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <Plus size={28} className="text-blue-400" />
                  </div>
                  <p className="font-semibold text-gray-700 mb-1">
                    {activeCustomTab ? '이 탭에 위젯이 없어요' : '아직 위젯이 없어요'}
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    체크리스트, 정산, 멤버 관리 등<br />위젯을 추가해보세요
                  </p>
                  <button
                    onClick={() => setShowAddWidget(true)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-2xl text-sm font-semibold active:bg-blue-600 transition-colors"
                  >
                    위젯 추가하기
                  </button>
                </div>
              ) : (
                filteredWidgets.map((widget) => {
                  if (widget.type === 'checklist') {
                    return (
                      <ChecklistWidget
                        key={widget.id}
                        widget={widget}
                        nickname={session.nickname ?? undefined}
                        onToggle={handleToggle}
                        onAdd={addChecklistItem}
                        onUpdate={updateChecklistItem}
                        onDelete={deleteChecklistItem}
                        onDeleteWidget={deleteWidget}
                      />
                    )
                  }
                  if (widget.type === 'expense') {
                    return (
                      <ExpenseWidget
                        key={widget.id}
                        widget={widget}
                        nickname={session.nickname ?? undefined}
                        participants={participants.map((p) => p.nickname)}
                        onUpdateData={updateExpenseData}
                        onTogglePayer={togglePayerStatus}
                        onDeleteWidget={deleteWidget}
                      />
                    )
                  }
                  if (widget.type === 'member') {
                    return (
                      <MemberWidget
                        key={widget.id}
                        widget={widget}
                        onUpdateData={updateMemberData}
                        onToggleStatus={toggleMemberStatus}
                        onDeleteWidget={deleteWidget}
                      />
                    )
                  }
                  if (widget.type === 'fee') {
                    return (
                      <FeeWidget
                        key={widget.id}
                        widget={widget}
                        nickname={session.nickname ?? undefined}
                        participants={participants.map((p) => p.nickname)}
                        onUpdateData={updateFeeData}
                        onToggleEntry={toggleFeeEntry}
                        onDeleteWidget={deleteWidget}
                      />
                    )
                  }
                  return (
                    <div
                      key={widget.id}
                      className="bg-white rounded-2xl border border-gray-100 p-4 opacity-60"
                    >
                      <p className="text-sm text-gray-400">
                        {widget.title || widget.type} (준비 중)
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </main>

          {/* 위젯 추가 버튼 (위젯이 있을 때) */}
          {filteredWidgets.length > 0 && (
            <div className="flex-none bg-white border-t border-gray-100 px-4 py-3 pb-safe">
              <button
                onClick={() => setShowAddWidget(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-500 text-white rounded-2xl font-semibold text-base active:bg-blue-600 transition-colors shadow-sm"
              >
                <Plus size={20} />
                위젯 추가하기
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 장부 탭 ── */}
      {activeSection === 'ledger' && (
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 pb-6">
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

      {/* 닉네임 모달 */}
      <SetNicknameModal
        isOpen={showNicknameModal}
        onNicknameSet={handleNicknameSet}
        isLoading={isJoiningRoom}
      />

      {/* 위젯 추가 Drawer */}
      <AddWidgetDrawer
        isOpen={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        onAdd={handleCreateWidget}
        error={widgetsError}
      />
    </div>
  )
}
