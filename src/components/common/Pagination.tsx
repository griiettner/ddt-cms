interface PaginationData {
  page?: number;
  pages?: number;
  total?: number;
  limit?: number;
}

interface PaginationProps {
  pagination: PaginationData | null | undefined;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, onPageChange }: PaginationProps): JSX.Element | null {
  const { page = 1, pages = 1, total = 0, limit = 10 } = pagination || {};

  if (total === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = (): (number | string)[] => {
    const maxVisible = 5;

    if (pages <= maxVisible) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }

    const pageNumbers: (number | string)[] = [];
    const leftBound = Math.max(2, page - 1);
    const rightBound = Math.min(pages - 1, page + 1);

    pageNumbers.push(1);

    if (leftBound > 2) {
      pageNumbers.push('...');
    }

    for (let i = leftBound; i <= rightBound; i++) {
      pageNumbers.push(i);
    }

    if (rightBound < pages - 1) {
      pageNumbers.push('...');
    }

    if (pages > 1) {
      pageNumbers.push(pages);
    }

    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-between border-t border-co-gray-200 px-4 py-3">
      <p className="text-sm text-co-gray-600">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>

      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              page === 1
                ? 'text-co-gray-400 cursor-not-allowed bg-co-gray-100'
                : 'bg-co-gray-100 text-co-gray-700 hover:bg-co-gray-200'
            }`}
          >
            Previous
          </button>

          {getPageNumbers().map((pageNum, idx) =>
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-co-gray-500">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum as number)}
                className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                  page === pageNum
                    ? 'bg-co-blue text-white'
                    : 'bg-co-gray-100 text-co-gray-700 hover:bg-co-gray-200'
                }`}
              >
                {pageNum}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === pages}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              page === pages
                ? 'text-co-gray-400 cursor-not-allowed bg-co-gray-100'
                : 'bg-co-gray-100 text-co-gray-700 hover:bg-co-gray-200'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Pagination;
