function Pagination({ pagination, onPageChange }) {
  const { page, pages, total } = pagination;

  if (!pages || pages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-co-gray-600">
        Showing page {page} of {pages} ({total} total)
      </p>
      <div className="flex gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              page === pageNum
                ? 'bg-co-blue text-white'
                : 'bg-co-gray-100 text-co-gray-700 hover:bg-co-gray-200'
            }`}
          >
            {pageNum}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Pagination;
