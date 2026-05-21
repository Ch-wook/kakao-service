'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { generateId, getCurrentTimestamp } from '@/lib/utils'
import type { Widget, ChecklistItem, ChecklistData, ExpenseData, MemberData, MemberStatus, LedgerData, FeeData, ScheduleData, MemoData, NoticeData, TabConfig, TabConfigData, ImageGalleryData, GalleryImage, MusicPlayerData, MusicTrack } from '@/types'

// 파일명 특수문자 제거 (Storage 경로 안전화)
const sanitizeFilename = (name: string): string =>
  name.replace(/[^\w.\-]/g, '_').replace(/_{2,}/g, '_')

// XHR 기반 실제 progress 업로드
// 세션 토큰이 없으면 Supabase 클라이언트로 fallback (토큰 자동 관리)
const uploadWithProgress = async (
  storagePath: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    // 세션 없음 → Supabase 클라이언트 사용 (내부적으로 anon key 자동 처리)
    let pct = 5
    onProgress(pct)
    const ticker = setInterval(() => { pct = Math.min(pct + 3, 90); onProgress(pct) }, 300)
    try {
      const { error } = await supabase.storage.from('collab-files').upload(storagePath, file)
      clearInterval(ticker)
      if (error) throw error
      onProgress(100)
    } catch (err) {
      clearInterval(ticker)
      onProgress(0)
      throw err
    }
    return
  }

  // 세션 토큰으로 XHR 업로드 (실제 progress)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/collab-files/${encodedPath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        onProgress(100)
        resolve()
      } else {
        try {
          const body = JSON.parse(xhr.responseText)
          reject(new Error(body?.message ?? '업로드에 실패했습니다'))
        } catch {
          reject(new Error(`업로드에 실패했습니다 (${xhr.status})`))
        }
      }
    }
    xhr.onerror = () => reject(new Error('네트워크 오류가 발생했습니다'))
    xhr.ontimeout = () => reject(new Error('업로드 시간이 초과됐습니다'))
    xhr.send(file)
  })
}

const asChecklist = (data: Record<string, unknown>): ChecklistData =>
  data as unknown as ChecklistData

const fromChecklist = (data: ChecklistData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asExpense = (data: Record<string, unknown>): ExpenseData =>
  data as unknown as ExpenseData

const fromExpense = (data: ExpenseData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asMember = (data: Record<string, unknown>): MemberData =>
  data as unknown as MemberData

const fromMember = (data: MemberData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asLedger = (data: Record<string, unknown>): LedgerData =>
  data as unknown as LedgerData

const fromLedger = (data: LedgerData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asFee = (data: Record<string, unknown>): FeeData =>
  data as unknown as FeeData

const fromFee = (data: FeeData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asSchedule = (data: Record<string, unknown>): ScheduleData =>
  data as unknown as ScheduleData

const fromSchedule = (data: ScheduleData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asMemo = (data: Record<string, unknown>): MemoData =>
  data as unknown as MemoData

const fromMemo = (data: MemoData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asNotice = (data: Record<string, unknown>): NoticeData =>
  data as unknown as NoticeData

const fromNotice = (data: NoticeData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asGallery = (data: Record<string, unknown>): ImageGalleryData =>
  data as unknown as ImageGalleryData

const fromGallery = (data: ImageGalleryData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>

const asMusic = (data: Record<string, unknown>): MusicPlayerData =>
  data as unknown as MusicPlayerData

const fromMusic = (data: MusicPlayerData): Record<string, unknown> =>
  data as unknown as Record<string, unknown>


export const useWidgets = (roomId: string) => {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 낙관적 업데이트 중인 위젯 ID 추적
  const optimisticUpdates = useRef<Set<string>>(new Set())

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
      setError(null)
    } catch (err) {
      console.error('Error fetching widgets:', err)
      setError('위젯을 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  // 초기 로드
  useEffect(() => {
    if (!roomId) return
    fetchWidgets()
  }, [roomId, fetchWidgets])

  // Realtime 구독 (postgres_changes)
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`widgets-realtime-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'widgets',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newWidget = payload.new as Widget
          setWidgets((prev) => {
            // 이미 존재하면 스킵
            if (prev.some((w) => w.id === newWidget.id)) return prev
            return [...prev, newWidget].sort((a, b) => a.order - b.order)
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'widgets',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updatedWidget = payload.new as Widget
          // 낙관적 업데이트 중인 위젯은 서버 응답으로 덮어쓰지 않음
          if (optimisticUpdates.current.has(updatedWidget.id)) return
          setWidgets((prev) =>
            prev.map((w) => (w.id === updatedWidget.id ? updatedWidget : w))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'widgets',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setWidgets((prev) => prev.filter((w) => w.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [roomId])

  // ─────────────────────────────────────────────
  // 위젯 생성
  // ─────────────────────────────────────────────
  const createWidget = useCallback(
    async (
      type: Widget['type'],
      title: string,
      initialData?: Record<string, unknown>
    ): Promise<Widget | null> => {
      try {
        const maxOrder = widgets.length > 0 ? Math.max(...widgets.map((w) => w.order)) : -1
        const defaultDataMap: Record<string, Record<string, unknown>> = {
          checklist: { items: [] },
          expense: { totalAmount: 0, description: '', payers: [] },
          member: { groups: [{ id: generateId(), name: '참석 현황', targetCount: 0, members: [] }] },
          ledger: {
            entries: [],
            openingBalance: 0,
            companyName: '',
            businessNumber: '',
            fiscalYear: new Date().getFullYear().toString(),
          },
          fee: { defaultAmount: 0, entries: [] },
          schedule: { items: [] },
          memo: { content: '' },
          notice: { content: '' },
          'image-gallery': { images: [] },
          'music-player': { tracks: [] },
        }
        const defaultData = defaultDataMap[type] ?? {}

        const { data, error: err } = await supabase
          .from('widgets')
          .insert({
            room_id: roomId,
            type,
            title,
            data: initialData ?? defaultData,
            order: maxOrder + 1,
          })
          .select()
          .single()

        if (err) throw err
        const newWidget = data as Widget
        // Realtime을 기다리지 않고 즉시 로컬 상태에 반영
        setWidgets((prev) => {
          if (prev.some((w) => w.id === newWidget.id)) return prev
          return [...prev, newWidget].sort((a, b) => a.order - b.order)
        })
        return newWidget
      } catch (err) {
        console.error('Error creating widget:', err)
        const msg = (err as { message?: string })?.message ?? '위젯 생성 중 오류가 발생했습니다'
        setError(msg)
        return null
      }
    },
    [roomId, widgets]
  )

  // ─────────────────────────────────────────────
  // 위젯 삭제
  // ─────────────────────────────────────────────
  const deleteWidget = useCallback(
    async (widgetId: string): Promise<boolean> => {
      try {
        // 낙관적 삭제
        setWidgets((prev) => prev.filter((w) => w.id !== widgetId))

        const { error: err } = await supabase
          .from('widgets')
          .delete()
          .eq('id', widgetId)

        if (err) {
          // 롤백
          await fetchWidgets()
          throw err
        }
        return true
      } catch (err) {
        console.error('Error deleting widget:', err)
        setError('위젯 삭제 중 오류가 발생했습니다')
        return false
      }
    },
    [fetchWidgets]
  )

  // ─────────────────────────────────────────────
  // 체크리스트: 아이템 추가
  // ─────────────────────────────────────────────
  const addChecklistItem = useCallback(
    async (widgetId: string, text: string, user?: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'checklist') return false

      const currentData = asChecklist(widget.data)
      const newItem: ChecklistItem = {
        id: generateId(),
        title: text,
        completed: false,
        assignee: user,
        created_at: getCurrentTimestamp(),
      }

      const updatedData: ChecklistData = {
        items: [...(currentData.items || []), newItem],
      }

      // 낙관적 업데이트
      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromChecklist(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error adding checklist item:', err)
        // 롤백
        setWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, data: fromChecklist(currentData) } : w
          )
        )
        setError('아이템 추가 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 체크리스트: 아이템 완료 토글 (낙관적 업데이트)
  // ─────────────────────────────────────────────
  const toggleChecklistItem = useCallback(
    async (widgetId: string, itemId: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'checklist') return false

      const currentData = asChecklist(widget.data)
      const updatedItems = currentData.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
      const updatedData: ChecklistData = { items: updatedItems }

      // 낙관적 업데이트 - 즉시 UI 반영
      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromChecklist(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error toggling checklist item:', err)
        // 롤백
        setWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, data: fromChecklist(currentData) } : w
          )
        )
        setError('체크 상태 변경 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 체크리스트: 아이템 텍스트 수정
  // ─────────────────────────────────────────────
  const updateChecklistItem = useCallback(
    async (widgetId: string, itemId: string, newText: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'checklist') return false

      const currentData = asChecklist(widget.data)
      const updatedItems = currentData.items.map((item) =>
        item.id === itemId ? { ...item, title: newText } : item
      )
      const updatedData: ChecklistData = { items: updatedItems }

      // 낙관적 업데이트
      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromChecklist(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating checklist item:', err)
        // 롤백
        setWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, data: fromChecklist(currentData) } : w
          )
        )
        setError('아이템 수정 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 체크리스트: 아이템 삭제
  // ─────────────────────────────────────────────
  const deleteChecklistItem = useCallback(
    async (widgetId: string, itemId: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'checklist') return false

      const currentData = asChecklist(widget.data)
      const updatedData: ChecklistData = {
        items: currentData.items.filter((item) => item.id !== itemId),
      }

      // 낙관적 업데이트
      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromChecklist(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error deleting checklist item:', err)
        // 롤백
        setWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, data: fromChecklist(currentData) } : w
          )
        )
        setError('아이템 삭제 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 정산: 전체 데이터 업데이트
  // ─────────────────────────────────────────────
  const updateExpenseData = useCallback(
    async (widgetId: string, newData: ExpenseData): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'expense') return false

      const currentData = asExpense(widget.data)

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromExpense(newData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating expense data:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromExpense(currentData) } : w))
        )
        setError('정산 데이터 업데이트 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 정산: 납부 상태 토글 (낙관적 업데이트)
  // ─────────────────────────────────────────────
  const togglePayerStatus = useCallback(
    async (widgetId: string, payerName: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'expense') return false

      const currentData = asExpense(widget.data)
      const perPerson =
        currentData.payers.length > 0 && currentData.totalAmount > 0
          ? Math.ceil(currentData.totalAmount / currentData.payers.length)
          : 0
      const updatedPayers = currentData.payers.map((p) => {
        if (p.name !== payerName) return p
        const becomingPaid = !p.paid
        return {
          ...p,
          paid: becomingPaid,
          paidAmount: becomingPaid && !p.paidAmount && perPerson > 0 ? perPerson : p.paidAmount,
        }
      })
      const updatedData: ExpenseData = { ...currentData, payers: updatedPayers }

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromExpense(updatedData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error toggling payer status:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromExpense(currentData) } : w))
        )
        setError('납부 상태 변경 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 인원 관리: 전체 데이터 업데이트
  // ─────────────────────────────────────────────
  const updateMemberData = useCallback(
    async (widgetId: string, newData: MemberData): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'member') return false

      const currentData = asMember(widget.data)

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromMember(newData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating member data:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromMember(currentData) } : w))
        )
        setError('인원 데이터 업데이트 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 인원 관리: 상태 토글 (낙관적 업데이트)
  // ─────────────────────────────────────────────
  const toggleMemberStatus = useCallback(
    async (widgetId: string, groupId: string, memberId: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'member') return false

      const currentData = asMember(widget.data)
      const statusCycle: MemberStatus[] = ['unknown', 'attending', 'arrived', 'preparing', 'absent', 'home']

      const updatedGroups = currentData.groups.map((group) => {
        if (group.id !== groupId) return group
        return {
          ...group,
          members: group.members.map((member) => {
            if (member.id !== memberId) return member
            const idx = statusCycle.indexOf(member.status ?? 'unknown')
            const nextStatus = statusCycle[(idx + 1) % statusCycle.length]
            return { ...member, status: nextStatus }
          }),
        }
      })

      const updatedData: MemberData = { groups: updatedGroups }

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromMember(updatedData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error toggling member status:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromMember(currentData) } : w))
        )
        setError('상태 변경 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 회계장부: 전체 데이터 업데이트
  // ─────────────────────────────────────────────
  const updateLedgerData = useCallback(
    async (widgetId: string, newData: LedgerData): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'ledger') return false

      const currentData = asLedger(widget.data)

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromLedger(newData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating ledger data:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromLedger(currentData) } : w))
        )
        setError('회계장부 데이터 업데이트 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 납부 체크: 전체 데이터 업데이트
  // ─────────────────────────────────────────────
  const updateFeeData = useCallback(
    async (widgetId: string, newData: FeeData): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'fee') return false

      const currentData = asFee(widget.data)

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromFee(newData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating fee data:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromFee(currentData) } : w))
        )
        setError('납부 데이터 업데이트 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 납부 체크: 납부 상태 토글 (낙관적 업데이트)
  // ─────────────────────────────────────────────
  const toggleFeeEntry = useCallback(
    async (widgetId: string, entryId: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'fee') return false

      const currentData = asFee(widget.data)
      const updatedEntries = currentData.entries.map((e) =>
        e.id === entryId ? { ...e, paid: !e.paid } : e
      )
      const updatedData: FeeData = { ...currentData, entries: updatedEntries }

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromFee(updatedData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error toggling fee entry:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromFee(currentData) } : w))
        )
        setError('납부 상태 변경 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 메모: 전체 데이터 업데이트
  // ─────────────────────────────────────────────
  const updateMemoData = useCallback(
    async (widgetId: string, newData: MemoData): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'memo') return false

      const currentData = asMemo(widget.data)

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromMemo(newData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating memo data:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromMemo(currentData) } : w))
        )
        setError('메모 데이터 업데이트 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 일정: 전체 데이터 업데이트
  // ─────────────────────────────────────────────
  const updateScheduleData = useCallback(
    async (widgetId: string, newData: ScheduleData): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'schedule') return false

      const currentData = asSchedule(widget.data)

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: fromSchedule(newData) } : w))
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating schedule data:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, data: fromSchedule(currentData) } : w))
        )
        setError('일정 데이터 업데이트 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 공지: 생성 또는 업데이트 (방당 1개)
  // ─────────────────────────────────────────────
  const upsertNotice = useCallback(
    async (newData: NoticeData): Promise<boolean> => {
      const existing = widgets.find((w) => w.type === 'notice')

      if (existing) {
        const currentData = asNotice(existing.data)
        optimisticUpdates.current.add(existing.id)
        setWidgets((prev) =>
          prev.map((w) => (w.id === existing.id ? { ...w, data: fromNotice(newData) } : w))
        )
        try {
          const { error: err } = await supabase
            .from('widgets')
            .update({ data: newData, updated_at: getCurrentTimestamp() })
            .eq('id', existing.id)
          if (err) throw err
          return true
        } catch (err) {
          console.error('Error updating notice:', err)
          setWidgets((prev) =>
            prev.map((w) => (w.id === existing.id ? { ...w, data: fromNotice(currentData) } : w))
          )
          return false
        } finally {
          optimisticUpdates.current.delete(existing.id)
        }
      } else {
        // 새로 생성
        const maxOrder = widgets.length > 0 ? Math.max(...widgets.map((w) => w.order)) : -1
        const { data, error: err } = await supabase
          .from('widgets')
          .insert({
            room_id: roomId,
            type: 'notice',
            title: '__notice__',
            data: newData as unknown as Record<string, unknown>,
            order: maxOrder + 1,
          })
          .select()
          .single()
        if (err) { console.error(err); return false }
        setWidgets((prev) => {
          if (prev.some((w) => w.id === (data as Widget).id)) return prev
          return [...prev, data as Widget].sort((a, b) => a.order - b.order)
        })
        return true
      }
    },
    [roomId, widgets]
  )

  // ─────────────────────────────────────────────
  // 탭: 파생 상태
  // ─────────────────────────────────────────────
  const tabConfigWidget = widgets.find((w) => w.type === 'tab-config')
  const tabs: TabConfig[] = (tabConfigWidget?.data?.tabs as TabConfig[]) ?? []

  // ─────────────────────────────────────────────
  // 탭: 새 탭 생성
  // ─────────────────────────────────────────────
  const createTab = useCallback(
    async (name: string): Promise<TabConfig | null> => {
      const newTab: TabConfig = { id: generateId(), name }
      const existing = widgets.find((w) => w.type === 'tab-config')

      if (!existing) {
        const maxOrder = widgets.length > 0 ? Math.max(...widgets.map((w) => w.order)) : -1
        const { data, error: err } = await supabase
          .from('widgets')
          .insert({
            room_id: roomId,
            type: 'tab-config',
            title: '__tab_config__',
            data: { tabs: [newTab] } as unknown as Record<string, unknown>,
            order: maxOrder + 1,
          })
          .select()
          .single()
        if (err) { console.error(err); return null }
        setWidgets((prev) => {
          if (prev.some((w) => w.id === (data as Widget).id)) return prev
          return [...prev, data as Widget].sort((a, b) => a.order - b.order)
        })
      } else {
        const currentTabs = (existing.data?.tabs as TabConfig[]) ?? []
        const newData: TabConfigData = { tabs: [...currentTabs, newTab] }
        optimisticUpdates.current.add(existing.id)
        setWidgets((prev) =>
          prev.map((w) => (w.id === existing.id ? { ...w, data: newData as unknown as Record<string, unknown> } : w))
        )
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', existing.id)
        optimisticUpdates.current.delete(existing.id)
        if (err) { console.error(err); await fetchWidgets(); return null }
      }
      return newTab
    },
    [roomId, widgets, fetchWidgets]
  )

  // ─────────────────────────────────────────────
  // 탭: 탭 삭제 (해당 탭의 위젯들 tab_id 초기화)
  // ─────────────────────────────────────────────
  const deleteTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const existing = widgets.find((w) => w.type === 'tab-config')
      if (!existing) return false

      const currentTabs = (existing.data?.tabs as TabConfig[]) ?? []
      const newData: TabConfigData = { tabs: currentTabs.filter((t) => t.id !== tabId) }

      optimisticUpdates.current.add(existing.id)
      setWidgets((prev) =>
        prev.map((w) => {
          if (w.id === existing.id) return { ...w, data: newData as unknown as Record<string, unknown> }
          if (w.tab_id === tabId) return { ...w, tab_id: null }
          return w
        })
      )

      try {
        await supabase
          .from('widgets')
          .update({ data: newData, updated_at: getCurrentTimestamp() })
          .eq('id', existing.id)
        await supabase
          .from('widgets')
          .update({ tab_id: null })
          .eq('room_id', roomId)
          .eq('tab_id', tabId)
        return true
      } catch (err) {
        console.error(err)
        await fetchWidgets()
        return false
      } finally {
        optimisticUpdates.current.delete(existing.id)
      }
    },
    [roomId, widgets, fetchWidgets]
  )

  // ─────────────────────────────────────────────
  // 탭: 위젯의 탭 배속 변경
  // ─────────────────────────────────────────────
  const setWidgetTab = useCallback(
    async (widgetId: string, tabId: string | null): Promise<boolean> => {
      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, tab_id: tabId } : w))
      )
      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ tab_id: tabId })
          .eq('id', widgetId)
        if (err) throw err
        return true
      } catch (err) {
        console.error(err)
        await fetchWidgets()
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [fetchWidgets]
  )

  // ─────────────────────────────────────────────
  // 이미지 갤러리: 이미지 업로드
  // ─────────────────────────────────────────────
  const uploadImage = useCallback(
    async (
      widgetId: string,
      file: File,
      nickname: string | undefined,
      onProgress: (pct: number) => void
    ): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'image-gallery') return false

      if (file.size > 10 * 1024 * 1024) throw new Error('파일 크기는 10MB 이하여야 합니다')
      if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 업로드할 수 있습니다')

      const uuid = crypto.randomUUID()
      const storagePath = `images/${roomId}/${widgetId}/${uuid}-${sanitizeFilename(file.name)}`

      onProgress(0)
      try {
        await uploadWithProgress(storagePath, file, onProgress)

        const { data: urlData } = supabase.storage
          .from('collab-files')
          .getPublicUrl(storagePath)

        const newImage: GalleryImage = {
          id: generateId(),
          url: urlData.publicUrl,
          storagePath,
          filename: file.name,
          uploaderNickname: nickname,
          uploadedAt: getCurrentTimestamp(),
          size: file.size,
        }

        const currentData = asGallery(widget.data)
        const updatedData: ImageGalleryData = {
          images: [...(currentData.images || []), newImage],
        }

        optimisticUpdates.current.add(widgetId)
        setWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, data: fromGallery(updatedData) } : w
          )
        )

        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) {
          await supabase.storage.from('collab-files').remove([storagePath])
          throw err
        }
        return true
      } catch (err) {
        onProgress(0)
        console.error('Error uploading image:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? widget : w))
        )
        throw err
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [roomId, widgets]
  )

  // ─────────────────────────────────────────────
  // 이미지 갤러리: 이미지 삭제
  // ─────────────────────────────────────────────
  const deleteImage = useCallback(
    async (widgetId: string, imageId: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'image-gallery') return false

      const currentData = asGallery(widget.data)
      const image = currentData.images?.find((img) => img.id === imageId)
      if (!image) return false

      const updatedData: ImageGalleryData = {
        images: (currentData.images || []).filter((img) => img.id !== imageId),
      }

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromGallery(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)
        if (err) throw err

        // storage 삭제는 soft fail (UI 일관성 우선)
        await supabase.storage.from('collab-files').remove([image.storagePath]).catch(console.error)
        return true
      } catch (err) {
        console.error('Error deleting image:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? widget : w))
        )
        setError('이미지 삭제 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 음악 플레이어: 트랙 업로드
  // ─────────────────────────────────────────────
  const uploadTrack = useCallback(
    async (
      widgetId: string,
      file: File,
      nickname: string | undefined,
      onProgress: (pct: number) => void
    ): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'music-player') return false

      if (file.size > 50 * 1024 * 1024) throw new Error('파일 크기는 50MB 이하여야 합니다')
      // MIME 타입 또는 확장자로 오디오 여부 확인 (.m4a는 video/mp4로 잡힐 수 있음)
      const audioExts = ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac', '.opus', '.mp4']
      const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
      if (!file.type.startsWith('audio/') && !audioExts.includes(fileExt)) {
        throw new Error('오디오 파일만 업로드할 수 있습니다 (MP3·M4A·WAV·OGG 등)')
      }

      const uuid = crypto.randomUUID()
      const storagePath = `music/${roomId}/${widgetId}/${uuid}-${sanitizeFilename(file.name)}`

      onProgress(0)
      try {
        await uploadWithProgress(storagePath, file, onProgress)

        const { data: urlData } = supabase.storage
          .from('collab-files')
          .getPublicUrl(storagePath)

        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        const newTrack: MusicTrack = {
          id: generateId(),
          url: urlData.publicUrl,
          storagePath,
          name: nameWithoutExt,
          originalFilename: file.name,
          uploaderNickname: nickname,
          uploadedAt: getCurrentTimestamp(),
          size: file.size,
        }

        const currentData = asMusic(widget.data)
        const updatedData: MusicPlayerData = {
          tracks: [...(currentData.tracks || []), newTrack],
        }

        optimisticUpdates.current.add(widgetId)
        setWidgets((prev) =>
          prev.map((w) =>
            w.id === widgetId ? { ...w, data: fromMusic(updatedData) } : w
          )
        )

        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)

        if (err) {
          await supabase.storage.from('collab-files').remove([storagePath])
          throw err
        }
        return true
      } catch (err) {
        onProgress(0)
        console.error('Error uploading track:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? widget : w))
        )
        throw err
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [roomId, widgets]
  )

  // ─────────────────────────────────────────────
  // 음악 플레이어: 트랙 삭제
  // ─────────────────────────────────────────────
  const deleteTrack = useCallback(
    async (widgetId: string, trackId: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'music-player') return false

      const currentData = asMusic(widget.data)
      const track = currentData.tracks?.find((t) => t.id === trackId)
      if (!track) return false

      const updatedData: MusicPlayerData = {
        tracks: (currentData.tracks || []).filter((t) => t.id !== trackId),
      }

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromMusic(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)
        if (err) throw err

        await supabase.storage.from('collab-files').remove([track.storagePath]).catch(console.error)
        return true
      } catch (err) {
        console.error('Error deleting track:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? widget : w))
        )
        setError('트랙 삭제 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  // ─────────────────────────────────────────────
  // 음악 플레이어: 트랙명 수정
  // ─────────────────────────────────────────────
  const updateTrackName = useCallback(
    async (widgetId: string, trackId: string, newName: string): Promise<boolean> => {
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget || widget.type !== 'music-player') return false

      const currentData = asMusic(widget.data)
      const updatedData: MusicPlayerData = {
        tracks: (currentData.tracks || []).map((t) =>
          t.id === trackId ? { ...t, name: newName } : t
        ),
      }

      optimisticUpdates.current.add(widgetId)
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId ? { ...w, data: fromMusic(updatedData) } : w
        )
      )

      try {
        const { error: err } = await supabase
          .from('widgets')
          .update({ data: updatedData, updated_at: getCurrentTimestamp() })
          .eq('id', widgetId)
        if (err) throw err
        return true
      } catch (err) {
        console.error('Error updating track name:', err)
        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? widget : w))
        )
        setError('트랙명 수정 중 오류가 발생했습니다')
        return false
      } finally {
        optimisticUpdates.current.delete(widgetId)
      }
    },
    [widgets]
  )

  return {
    widgets,
    isLoading,
    error,
    refetch: fetchWidgets,
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
  }
}
