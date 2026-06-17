'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'

interface SortableWidgetWrapperProps {
  id: string
  children: ReactNode
}

export function SortableWidgetWrapper({ id, children }: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-2xl transition-all duration-200 ${
        isDragging ? 'opacity-90 scale-[1.02] shadow-xl ring-2 ring-blue-400' : 'opacity-100'
      }`}
    >
      {/* 상단 중앙 드래그 핸들 (위젯 카드 위에 오버레이) */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 px-5 py-1.5 cursor-grab active:cursor-grabbing touch-none"
        aria-label="위젯 순서 변경"
      >
        <div className="w-8 h-1 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors" />
      </div>

      {/* 위젯 본문 */}
      <div className="w-full">{children}</div>
    </div>
  )
}
