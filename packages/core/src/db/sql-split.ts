/**
 * Split a SQL script into statements. Dollar quotes, strings and comments
 * keep their semicolons. Migrations are applied one statement at a time.
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];

    if (char === "-" && sql[index + 1] === "-") {
      const end = sql.indexOf("\n", index);
      const next = end === -1 ? sql.length : end + 1;
      current += sql.slice(index, next);
      index = next;
      continue;
    }

    if (char === "/" && sql[index + 1] === "*") {
      const end = sql.indexOf("*/", index + 2);
      if (end === -1) throw new Error("unterminated block comment");
      current += sql.slice(index, end + 2);
      index = end + 2;
      continue;
    }

    if (char === "'") {
      let cursor = index + 1;
      while (cursor < sql.length) {
        if (sql[cursor] === "'" && sql[cursor + 1] === "'") {
          cursor += 2;
          continue;
        }
        if (sql[cursor] === "'") {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      if (sql[cursor - 1] !== "'") throw new Error("unterminated string");
      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    if (char === '"') {
      let cursor = index + 1;
      while (cursor < sql.length) {
        if (sql[cursor] === '"' && sql[cursor + 1] === '"') {
          cursor += 2;
          continue;
        }
        if (sql[cursor] === '"') {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      if (sql[cursor - 1] !== '"') throw new Error("unterminated identifier");
      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    if (char === "$") {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(index));
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, index + tag.length);
        if (end === -1) throw new Error(`unterminated dollar quote ${tag}`);
        const next = end + tag.length;
        current += sql.slice(index, next);
        index = next;
        continue;
      }
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}
