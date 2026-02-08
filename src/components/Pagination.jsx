import React from "react";
import "../styles/request.css"; // dùng lại style sẵn có

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 6,
}) => {
  // --- Logic phân trang kiểu Jira ---
  const getVisiblePages = () => {
    const pages = [];
    const last = totalPages || 1;

    if (last <= maxVisible) {
      for (let i = 1; i <= last; i++) pages.push(i);
      return pages;
    }

    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "dots", last);
    } else if (currentPage > 3 && currentPage < last - 2) {
      pages.push(
        1,
        "dots",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "dots",
        last
      );
    } else {
      pages.push(1, "dots", last - 3, last - 2, last - 1, last);
    }

    return pages;
  };

  return (
    <div className="clean-pagination">
      {/* Nút quay về trang đầu */}
      <button
        className="nav-btn"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        &lt;
      </button>

      {/* Số trang */}
      <div className="page-numbers">
        {getVisiblePages().map((num, i) =>
          num === "dots" ? (
            <span key={`dots-${i}`} className="dots">
              ...
            </span>
          ) : (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={`btn-page-number ${
                currentPage === num ? "active-page" : ""
              }`}
            >
              {num}
            </button>
          )
        )}
      </div>

      {/* Nút tới trang cuối */}
      <button
        className="nav-btn"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;