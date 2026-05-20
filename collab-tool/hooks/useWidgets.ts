'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { generateId, getCurrentTimestamp } from '@/lib/utils'
import type { Widget, ChecklistItem, ChecklistData, ExpenseData, MemberData, MemberStatus, LedgerData, FeeData } from '@/types'

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

  return {
    widgets,
    isLoading,
    error,
    refetch: fetchWidgets,
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
  }
}
