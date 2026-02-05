/**
 * Types Section Component with Drag and Drop
 */
import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ConfigOption } from '@/types/entities';

interface TypesSectionProps {
  types: ConfigOption[];
  onAddClick: (category: 'type') => void;
  onDeleteClick: (id: number) => void;
  onReorder: (ids: number[]) => void;
}

interface SortableRowProps {
  item: ConfigOption;
  onDelete: (id: number) => void;
}

function SortableRow({ item, onDelete }: SortableRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'bg-co-blue-50' : ''}>
      <td className="w-8 cursor-grab text-center" {...attributes} {...listeners}>
        <svg
          className="text-co-gray-400 inline-block h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </td>
      <td className="font-semibold text-co-blue">{item.display_name}</td>
      <td className="font-mono text-xs text-co-gray-500">{item.key}</td>
      <td className="text-right">
        <button onClick={() => onDelete(item.id)} className="text-sm text-co-red hover:underline">
          &times; Remove
        </button>
      </td>
    </tr>
  );
}

function TypesSection({
  types,
  onAddClick,
  onDeleteClick,
  onReorder,
}: TypesSectionProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = types.findIndex((t) => t.id === active.id);
        const newIndex = types.findIndex((t) => t.id === over.id);
        const newOrder = arrayMove(types, oldIndex, newIndex);
        onReorder(newOrder.map((t) => t.id));
      }
    },
    [types, onReorder]
  );

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="card-header mb-0">Element Types</h2>
        <button onClick={() => onAddClick('type')} className="btn-primary btn-sm">
          + Add Type
        </button>
      </div>
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Display Name</th>
                <th>Key</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center italic text-co-gray-500">
                    No element types configured.
                  </td>
                </tr>
              ) : (
                <SortableContext
                  items={types.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {types.map((t) => (
                    <SortableRow key={t.id} item={t} onDelete={onDeleteClick} />
                  ))}
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

export default TypesSection;
