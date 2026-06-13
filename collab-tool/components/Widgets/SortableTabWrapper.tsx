'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'

interface SortableTabWrapperProps {
  id: string
  children: ReactNode
}

export function SortableTabWrapper({ id, children }: SortableTabWrapperProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex-none flex items-center transition-all duration-200 cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'opacity-80 scale-105 z-50 shadow-md ring-1 ring-blue-300 rounded-lg bg-white/80' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-auto flex items-center">
        {children}
      </div>
    </div>
  )
}
