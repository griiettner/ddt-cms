/**
 * Actions Section Component with Drag and Drop
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

interface ActionsSectionProps {
  actions: ConfigOption[];
  onAddClick: (category: 'action') => void;
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
      <td>
        <span className="rounded-full bg-co-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-co-gray-600">
          {item.result_type || 'None'}
        </span>
      </td>
      <td className="text-right">
        <button onClick={() => onDelete(item.id)} className="text-sm text-co-red hover:underline">
          &times; Remove
        </button>
      </td>
    </tr>
  );
}

function ActionsSection({
  actions,
  onAddClick,
  onDeleteClick,
  onReorder,
}: ActionsSectionProps): JSX.Element {
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
        const oldIndex = actions.findIndex((a) => a.id === active.id);
        const newIndex = actions.findIndex((a) => a.id === over.id);
        const newOrder = arrayMove(actions, oldIndex, newIndex);
        onReorder(newOrder.map((a) => a.id));
      }
    },
    [actions, onReorder]
  );

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="card-header mb-0">Test Actions</h2>
        <button onClick={() => onAddClick('action')} className="btn-primary btn-sm">
          + Add Action
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
                <th>Result Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center italic text-co-gray-500">
                    No test actions configured.
                  </td>
                </tr>
              ) : (
                <SortableContext
                  items={actions.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {actions.map((a) => (
                    <SortableRow key={a.id} item={a} onDelete={onDeleteClick} />
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

export default ActionsSection;
