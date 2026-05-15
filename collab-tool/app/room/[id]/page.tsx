'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import SetNicknameModal from '@/components/Auth/SetNicknameModal'
import Button from '@/components/Shared/Button'
import { ArrowLeft, Users } from 'lucide-react'
import type { Room, Participant } from '@/types'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const { session, isLoading: authLoading, setNickname } = useAuth()

  // 상태 관리
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1단계: 방 정보 조회
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setIsLoadingRoom(true)
        const response = await fetch(`/api/rooms/${roomId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('방을 찾을 수 없습니다')
            // 3초 후 홈으로 리다이렉트
            setTimeout(() => router.push('/'), 3000)
          } else {
            setError('방 정보를 불러올 수 없습니다')
          }
          return
        }

        const data = await response.json()
        setRoom(data)
      } catch (err) {
        setError('방 정보 조회 중 오류가 발생했습니다')
      } finally {
        setIsLoadingRoom(false)
      }
    }

    if (roomId) {
      fetchRoom()
    }
  }, [roomId, router])

  // 2단계: 참여자 목록 구독 (Realtime)
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room-participants-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchParticipants()
        }
      )
      .subscribe()

    fetchParticipants()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [roomId])

  // 참여자 목록 조회
  const fetchParticipants = async () => {
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
  }

  // 3단계: 인증 완료 후 닉네임 확인
  useEffect(() => {
    if (authLoading || !session.user) return

    // 닉네임이 있으면 방에 참여
    if (session.nickname) {
      joinRoom(session.nickname)
    } else {
      // 닉네임이 없으면 모달 표시
      setShowNicknameModal(true)
    }
  }, [session.user, session.nickname, authLoading])

  // 닉네임 설정 후 방 참여
  const handleNicknameSet = async (nickname: string) => {
    setIsJoiningRoom(true)

    try {
      // 1. 닉네임 저장 (useAuth 훅에서 처리)
      const success = setNickname(nickname)
      if (!success) {
        setError('닉네임 설정 실패')
        return
      }

      // 2. 참여자로 등록
      await joinRoom(nickname)
      setShowNicknameModal(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '참여 중 오류가 발생했습니다'
      )
    } finally {
      setIsJoiningRoom(false)
    }
  }

  // 방에 참여자로 등록
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
    } catch (err) {
      if (err instanceof Error && !err.message.includes('이미')) {
        setError(err.message)
      }
      // 닉네임 중복인 경우 무시 (이미 참여 중)
    }
  }

  // 로딩 상태
  if (authLoading || isLoadingRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            방을 찾을 수 없습니다
          </h1>
          <p className="text-gray-600 mb-6">
            존재하지 않는 방이거나 삭제된 방입니다.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/')}
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  // 메인 페이지
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="뒤로가기"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {room?.title || '협업'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={16} />
            <span>{participants.length}명 참여 중</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: 주요 콘텐츠 */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">
                  위젯이 여기에 표시됩니다
                </p>
                <p className="text-sm">
                  (2단계 완성 후 체크리스트, 투표 등이 추가됩니다)
                </p>
              </div>
            </div>
          </div>

          {/* Right: 참여자 목록 */}
          <aside className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              참여자
            </h2>
            <div className="space-y-2">
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: participant.color || '#3B82F6',
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {participant.nickname}
                        {currentParticipant?.id === participant.id && (
                          <span className="ml-2 text-xs text-blue-600">
                            (나)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(participant.last_active).toLocaleTimeString(
                          'ko-KR',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">참여자 없음</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* 닉네임 설정 모달 */}
      <SetNicknameModal
        isOpen={showNicknameModal}
        onNicknameSet={handleNicknameSet}
        isLoading={isJoiningRoom}
      />
    </div>
  )
}
