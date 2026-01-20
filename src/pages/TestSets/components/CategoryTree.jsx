/**
 * CategoryTree Component
 * Displays categories in a tree structure with expand/collapse
 */
import { useState } from 'react';

// Inline SVG Icons
const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const FolderIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FolderOpenIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

function CategoryTreeNode({
  category,
  level = 0,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const indent = level * 24;

  return (
    <div className="category-tree-node">
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-co-gray-50 rounded-lg group"
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => hasChildren && onToggle(category.id)}
          className={`p-0.5 rounded ${hasChildren ? 'hover:bg-co-gray-200 cursor-pointer' : 'opacity-0'}`}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-co-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-co-gray-500" />
            )
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        {/* Folder Icon */}
        {isExpanded && hasChildren ? (
          <FolderOpenIcon className="w-5 h-5 text-co-blue-500" />
        ) : (
          <FolderIcon className="w-5 h-5 text-co-blue-400" />
        )}

        {/* Category Name */}
        <span className="flex-1 text-sm font-medium text-co-gray-800">
          {category.name}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(category)}
            className="p-1 hover:bg-co-gray-200 rounded"
            title="Add subcategory"
          >
            <PlusIcon className="w-4 h-4 text-co-gray-500" />
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1 hover:bg-co-gray-200 rounded"
            title="Edit category"
          >
            <PencilIcon className="w-4 h-4 text-co-gray-500" />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-1 hover:bg-red-100 rounded"
            title="Delete category"
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="category-tree-children">
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTree({ tree, onEdit, onDelete, onAddChild, onCreateRoot }) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    const allIds = new Set();
    function collectIds(nodes) {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    }
    collectIds(tree);
    setExpandedIds(allIds);
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  if (!tree || tree.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="w-12 h-12 text-co-gray-300 mx-auto mb-4" />
        <p className="text-co-gray-500 mb-4">No categories yet</p>
        <button onClick={onCreateRoot} className="btn-primary btn-sm">
          Create First Category
        </button>
      </div>
    );
  }

  return (
    <div className="category-tree">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-co-gray-200">
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="btn-outline btn-sm">
            Expand All
          </button>
          <button onClick={collapseAll} className="btn-outline btn-sm">
            Collapse All
          </button>
        </div>
        <button onClick={onCreateRoot} className="btn-primary btn-sm flex items-center gap-1">
          <PlusIcon className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {tree.map((category) => (
          <CategoryTreeNode
            key={category.id}
            category={category}
            expandedIds={expandedIds}
            onToggle={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
      </div>
    </div>
  );
}

export default CategoryTree;
