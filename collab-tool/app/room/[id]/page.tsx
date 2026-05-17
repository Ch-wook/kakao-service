'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useWidgets } from '@/hooks/useWidgets'
import SetNicknameModal from '@/components/Auth/SetNicknameModal'
import ChecklistWidget from '@/components/Widgets/ChecklistWidget'
import AddWidgetDrawer from '@/components/Widgets/AddWidgetDrawer'
import { Share2, Users, Plus, ArrowLeft } from 'lucide-react'
import { generateShareUrl } from '@/lib/utils'
import type { Room, Participant } from '@/types'

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

  const {
    widgets,
    isLoading: widgetsLoading,
    createWidget,
    deleteWidget,
    addChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  } = useWidgets(roomId)

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

  const joinRoom = async (nickname: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })

      if (!response.ok) {
        const data = await response.json()
        // 닉네임 중복은 에러가 아님 - 이미 참여 중
        if (data.error?.includes('이미')) return
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

  // 공유하기 (Web Share API → fallback: clipboard)
  const handleShare = async () => {
    const shareUrl = generateShareUrl(roomId)
    const shareData = {
      title: room?.title || 'Collab 협업',
      text: `${room?.title || '협업'}에 참여하세요!`,
      url: shareUrl,
    }

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    } catch {
      // 사용자가 공유 취소 - 무시
    }

    if ('vibrate' in navigator) navigator.vibrate(50)
  }

  // 체크 토글 + 햅틱
  const handleToggle = async (widgetId: string, itemId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30)
    return toggleChecklistItem(widgetId, itemId)
  }

  // 로딩
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

  // 방 없음
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
          {/* 왼쪽: 뒤로가기 + 방 제목 */}
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

          {/* 오른쪽: 공유 버튼 */}
          <button
            onClick={handleShare}
            className="flex-none flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium active:bg-blue-100 transition-colors"
          >
            <Share2 size={14} />
            <span>{shareSuccess ? '복사됨!' : '공유'}</span>
          </button>
        </div>
      </header>

      {/* ── Scrollable Content ── */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-4 space-y-3 pb-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {widgetsLoading ? (
            // Skeleton UI
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
          ) : widgets.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Plus size={28} className="text-blue-400" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">아직 위젯이 없어요</p>
              <p className="text-sm text-gray-400 mb-6">
                아래 버튼을 눌러 체크리스트를<br />추가해보세요
              </p>
              <button
                onClick={() => setShowAddWidget(true)}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold"
              >
                첫 위젯 추가하기
              </button>
            </div>
          ) : (
            // 위젯 목록
            widgets.map((widget) => {
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
              // 미구현 위젯 placeholder
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

      {/* ── Fixed Bottom Bar ── */}
      <div className="flex-none bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        <button
          onClick={() => setShowAddWidget(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-500 text-white rounded-2xl font-semibold text-base active:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus size={20} />
          위젯 추가
        </button>
      </div>

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
        onAdd={createWidget}
      />
    </div>
  )
}
