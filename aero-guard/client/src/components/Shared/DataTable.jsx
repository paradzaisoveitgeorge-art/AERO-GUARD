// Generic table. `columns` is [{ key, label, render? }], `rows` is an array of objects.
export default function DataTable({ columns, rows, emptyText = "No records." }) {
  if (!rows?.length) {
    return <p className="data-table__empty">{emptyText}</p>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id ?? i}>
            {columns.map((col) => (
              <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
