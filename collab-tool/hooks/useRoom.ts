'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Room, Widget, Participant } from '@/types'

export const useRoom = (roomId: string) => {
  const [room, setRoom] = useState<Room | null>(null)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 방 정보 조회
  const fetchRoom = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/rooms/${roomId}`)

      if (!response.ok) {
        throw new Error('방을 찾을 수 없습니다')
      }

      const data = await response.json()
      setRoom(data)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '방 조회 실패'
      )
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  // 위젯 목록 조회
  const fetchWidgets = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('widgets')
        .select('*')
        .eq('room_id', roomId)
        .order('order', { ascending: true })

      if (err) throw err
      setWidgets(data || [])
    } catch (err) {
      console.error('Error fetching widgets:', err)
    }
  }, [roomId])

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

  // 초기 데이터 로드
  useEffect(() => {
    if (!roomId) return

    fetchRoom()
    fetchWidgets()
    fetchParticipants()
  }, [roomId, fetchRoom, fetchWidgets, fetchParticipants])

  // Realtime 구독 (위젯)
  useEffect(() => {
    if (!roomId) return

    const widgetChannel = supabase
      .channel(`room-widgets-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widgets',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchWidgets()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(widgetChannel)
    }
  }, [roomId, fetchWidgets])

  // Realtime 구독 (참여자)
  useEffect(() => {
    if (!roomId) return

    const participantChannel = supabase
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

    return () => {
      void supabase.removeChannel(participantChannel)
    }
  }, [roomId, fetchParticipants])

  return {
    room,
    widgets,
    participants,
    isLoading,
    error,
    refetchRoom: fetchRoom,
    refetchWidgets: fetchWidgets,
    refetchParticipants: fetchParticipants,
  }
}
