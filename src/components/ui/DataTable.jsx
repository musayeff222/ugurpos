import { useMemo, useState } from "react";

export default function DataTable({
  columns,
  rows,
  searchable = true,
  pageSize: initialPageSize = 10,
  emptyText = "Kayıt bulunamadı.",
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLocaleLowerCase("tr");
    return rows.filter((row) =>
      columns.some((col) => String(row[col.key] ?? "").toLocaleLowerCase("tr").includes(q))
    );
  }, [rows, search, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="data-table">
      <div className="table-toolbar">
        <label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{" "}
          kayıt göster
        </label>
        {searchable && (
          <label className="table-search">
            Ara:
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  {emptyText}
                </td>
              </tr>
            ) : (
              slice.map((row, idx) => (
                <tr key={row.id ?? idx}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          {filtered.length} kayıttan {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} ile{" "}
          {Math.min(currentPage * pageSize, filtered.length)} arasındakiler
        </span>
        <div className="pagination">
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage(1)}>
            İlk
          </button>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
            Önceki
          </button>
          <span className="page-num">{currentPage}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Sonraki
          </button>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>
            Son
          </button>
        </div>
      </div>
    </div>
  );
}
