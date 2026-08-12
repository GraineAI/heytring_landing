/**
 * CSV serialisation, shared so every export escapes identically.
 *
 * The quoting rule is the easy half and was already right. The half that was missing is that this
 * file is opened in Excel by the marketing team, and Excel executes cells beginning with = + - @.
 * Several columns here are USER-SUPPLIED free text — exit notes, the name someone typed on the
 * "what should we call you?" screen — so a user can put a formula in our spreadsheet. That is
 * CSV injection, and the fix is to force those cells to text.
 *
 * Prefixing with an apostrophe is the standard remedy and has a second benefit: +919876543210
 * starts with '+', so it was already in the danger set, and quoting it as text also stops Excel
 * rewriting Indian phone numbers into scientific notation.
 */

const RISKY = /^[=+\-@\t\r]/;

export function escapeCell(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // Force-to-text BEFORE quoting, so the apostrophe ends up inside the quotes where Excel reads it.
  if (RISKY.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns, headers) {
  const head = (headers || columns).join(",");
  const body = (rows || []).map((r) => columns.map((c) => escapeCell(r?.[c])).join(","));
  return [head, ...body].join("\r\n");     // CRLF: RFC 4180, and the only thing Excel reads reliably
}

/**
 * A Response that downloads. The BOM is not optional: without it Excel on Windows decodes the file
 * as the local ANSI codepage, and every Devanagari name and every rupee sign arrives as mojibake.
 */
export function csvResponse(csv, filename) {
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
