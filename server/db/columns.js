export function tableColumns(db, table) {
  if (db.dialect === "mysql") {
    return db
      .prepare(`SHOW COLUMNS FROM \`${table}\``)
      .all()
      .map((c) => c.Field);
  }
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

export function hasColumn(db, table, column) {
  return tableColumns(db, table).includes(column);
}

export function addColumnIfMissing(db, table, column, definition) {
  if (hasColumn(db, table, column)) return;
  if (db.dialect === "mysql") {
    db.exec(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
  } else {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
