'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'
import { GripVertical } from 'lucide-react'

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
      {/* 드래그 핸들 — 이 영역만 touch-none + grab */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 active:bg-gray-200 cursor-grab active:cursor-grabbing touch-none transition-colors"
        aria-label="위젯 순서 변경"
      >
        <GripVertical size={14} />
      </button>

      {/* 위젯 본문 — 터치 스크롤 정상 작동 */}
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  )
}
