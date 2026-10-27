import { describe, expect, it } from "vitest";
import { splitSql } from "./sql-split";

describe("splitSql", () => {
  it("keeps semicolons inside function bodies and strings", () => {
    const sql = `
      CREATE FUNCTION f() RETURNS void AS $$
      BEGIN
        PERFORM 1;
      END;
      $$ LANGUAGE plpgsql;
      SELECT 'a;b';
      SELECT 1;
    `;
    const statements = splitSql(sql);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toContain("PERFORM 1;");
    expect(statements[1]).toBe("SELECT 'a;b'");
    expect(statements[2]).toBe("SELECT 1");
  });
});
