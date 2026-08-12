/** Run: node app/lib/csv.test.mjs */
import { escapeCell, toCsv } from "./csv.js";

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (got === want) { pass++; }
  else { fail++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};

// Quoting — the part that already worked, pinned so it stays working.
eq(escapeCell("Sharma, Rishabh"), '"Sharma, Rishabh"', "comma is quoted");
eq(escapeCell('he said "no"'), '"he said ""no"""', "inner quotes are doubled");
eq(escapeCell("line one\nline two"), '"line one\nline two"', "newline is quoted");
eq(escapeCell(null), "", "null is empty, not the string null");
eq(escapeCell(undefined), "", "undefined is empty");
eq(escapeCell(0), "0", "zero survives — falsy is not empty");
eq(escapeCell(false), "false", "false survives");

// CSV INJECTION. Every one of these is a formula Excel will execute on open, and every one can
// arrive from a field a user typed into the app.
eq(escapeCell("=1+1"), "'=1+1", "= is neutralised");
// A space is not a quoting trigger under RFC 4180, so this is correctly left bare — the
// apostrophe alone is what makes Excel read it as text rather than mangling the number.
eq(escapeCell("+91 98765 43210"), "'+91 98765 43210", "+ is neutralised without needless quoting");
eq(escapeCell("-2+3"), "'-2+3", "- is neutralised");
eq(escapeCell("@SUM(A1)"), "'@SUM(A1)", "@ is neutralised");
eq(
  escapeCell('=HYPERLINK("http://evil.test","click")'),
  `"'=HYPERLINK(""http://evil.test"",""click"")"`,
  "the classic exfiltration payload is both neutralised and quoted",
);

// Ordinary text that merely CONTAINS an operator must not be mangled.
eq(escapeCell("A-1 Block"), "A-1 Block", "a dash inside the value is untouched");
eq(escapeCell("2+2 is 4"), "2+2 is 4", "an operator mid-string is untouched");

// Whole-file shape.
const csv = toCsv([{ a: 1, b: "x,y" }, { a: null, b: "=z" }], ["a", "b"]);
eq(csv, 'a,b\r\n1,"x,y"\r\n,\'=z', "rows join with CRLF and honour per-cell rules");
eq(toCsv([], ["a", "b"]), "a,b", "an empty export is still a valid file with headers");
eq(toCsv([{ a: 1 }], ["a"], ["Phone number"]), "Phone number\r\n1", "friendly headers override field names");

console.log(fail ? `${pass} passed, ${fail} FAILED` : `${pass}/${pass} csv checks passed`);

// ── regressions found by adversarial review of the first version ──────────────────────
let p2 = 0, f2 = 0;
const esc2 = escapeCell, csv2 = toCsv;
const eq2 = (got, want, msg) => {
  if (got === want) { p2++; }
  else { f2++; console.error(`FAIL ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};

// A plain negative number must stay a NUMBER. Prefixed, Excel files it as text: it will not SUM,
// will not sort numerically, and contributes 0 to every aggregate without erroring.
eq2(esc2(-5), "-5", "negative integer stays numeric");
eq2(esc2("-12.5"), "-12.5", "negative decimal stays numeric");
eq2(esc2(-0.5), "-0.5", "negative fraction stays numeric");
// ...but anything that is not purely a number keeps the guard.
eq2(esc2("-5+3"), "'-5+3", "an expression is still neutralised");
eq2(esc2("-=cmd|'/c calc'!A1"), "'-=cmd|'/c calc'!A1", "the DDE payload is still neutralised");

// THE HEADER ROW must be escaped like any other. Unescaped, one comma in a label shifts every
// column NAME by one while the data stays put — every number filed under the wrong heading.
eq2(
  csv2([{ a: 1 }], ["a"], ["Calls, answered"]),
  '"Calls, answered"\r\n1',
  "a comma in a header is quoted",
);
eq2(csv2([{ a: 1 }], ["a"], ['He said "hi"']), '"He said ""hi"""\r\n1', "quotes in a header are doubled");

// Machine consumers can opt out of the Excel convention entirely.
eq2(esc2("+919876543210", { safe: false }), "+919876543210", "raw mode round-trips a phone number");
eq2(esc2("=1+1", { safe: false }), "=1+1", "raw mode is byte-clean by request");
eq2(esc2("+919876543210"), "'+919876543210", "safe mode is still the default");

console.log(f2 ? `${p2} passed, ${f2} FAILED (regressions)` : `${p2}/${p2} regression checks passed`);
process.exit(fail + f2 ? 1 : 0);
