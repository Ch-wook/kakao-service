'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
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
    <div ref={setNodeRef} style={style} className={`relative flex group ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
      {/* 드래그 핸들 */}
      <div className="flex-none flex items-start pt-4 pr-1 pl-0.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1 text-gray-300 hover:text-gray-500 active:text-blue-500 cursor-grab active:cursor-grabbing touch-none rounded-lg"
          aria-label="위젯 순서 변경"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
      </div>

      {/* 위젯 본문 */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
