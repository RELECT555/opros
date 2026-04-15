import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, ReactNode } from 'react'

type DragArgs = { dragHandle: ReactNode }

type Props = {
  id: string
  children: (args: DragArgs) => ReactNode
}

/** Только внутри `<SortableContext>` + `<DndContext>`. */
export function SortableCanvasItem({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 40 : undefined,
    position: 'relative',
  }

  const dragHandle = (
    <button
      type="button"
      className="canvas-live-drag-handle"
      {...attributes}
      {...listeners}
      aria-label="Перетащить блок"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="9" cy="7" r="1.6" />
        <circle cx="15" cy="7" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="17" r="1.6" />
        <circle cx="15" cy="17" r="1.6" />
      </svg>
    </button>
  )

  return (
    <div ref={setNodeRef} style={style} className="canvas-live-sortable-root">
      {children({ dragHandle })}
    </div>
  )
}
