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

// A PLAIN NEGATIVE NUMBER IS NOT AN ATTACK. `-` is in RISKY, so -5 was being emitted as '-5 —
// which Excel files as text, meaning it will not SUM, will not sort numerically, and contributes
// zero to any aggregate, silently. Only counts are exported today so nothing is broken yet, but
// the first delta or change column would arrive corrupted with no error anywhere.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function escapeCell(v, { safe = true } = {}) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // Force-to-text BEFORE quoting, so the apostrophe ends up inside the quotes where Excel reads it.
  if (safe && RISKY.test(s) && !PLAIN_NUMBER.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns, headers, opts) {
  // THE HEADER ROW GOES THROUGH THE SAME ESCAPING AS THE BODY. It used to be join(",") raw, which
  // works only for as long as every header happens to be comma-free. The first header containing
  // a comma shifts every LABEL by one column while the data rows stay put — producing a file
  // where every number is filed under the wrong name, which is worse than a file that fails.
  const head = (headers || columns).map((h) => escapeCell(h, opts)).join(",");
  const body = (rows || []).map((r) => columns.map((c) => escapeCell(r?.[c], opts)).join(","));
  return [head, ...body].join("\r\n");     // CRLF: RFC 4180, and the only thing Excel reads reliably
}

/**
 * TWO AUDIENCES, AND THEY WANT OPPOSITE THINGS. The apostrophe prefix is an Excel display
 * convention, not CSV syntax: a machine re-importing this file reads a literal leading apostrophe,
 * and since `phone` is the join key for the app-user export, a CRM ingesting it would fail to
 * match every row. Excel is the primary consumer here — the marketing team opens these to ring
 * people — so safe mode is the default, and `?safe=0` gives a byte-clean file for anything that
 * parses rather than displays.
 */

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
