'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'
import { FolderOutput } from 'lucide-react'

interface SortableWidgetWrapperProps {
  id: string
  children: ReactNode
  onMoveWidget?: () => void
}

export function SortableWidgetWrapper({ id, children, onMoveWidget }: SortableWidgetWrapperProps) {
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
      className={`relative rounded-2xl transition-all duration-200 group ${
        isDragging ? 'opacity-90 scale-[1.02] shadow-xl ring-2 ring-blue-400' : 'opacity-100'
      }`}
    >
      {/* 탭 이동 버튼 (마우스 오버 시 표시) */}
      {onMoveWidget && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveWidget() }}
          className="absolute top-2 left-2 z-20 p-1.5 bg-white/70 backdrop-blur-md rounded-lg text-gray-500 hover:text-blue-600 hover:bg-white shadow-sm border border-gray-100 transition-all md:opacity-0 group-hover:opacity-100 touch-manipulation"
          title="다른 탭으로 이동"
        >
          <FolderOutput size={14} />
        </button>
      )}

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

