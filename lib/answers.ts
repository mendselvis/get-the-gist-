// answer comparison, kept free of runtime imports so it can be tested on its own
import type { Question } from "@/lib/schema";

/* ---------- comparing answers written in different forms ---------- */

function toNumber(token: string): number | null {
  const t = token.replace(/[_\s]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const sub2 = t.match(/^([01]+)(₂|\(2\)|base2)$/i);
  if (sub2) return parseInt(sub2[1], 2);
  if (/^-?0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
  if (/^-?0b[01]+$/i.test(t)) return parseInt(t.replace(/0b/i, ""), 2) * (t.startsWith("-") ? -1 : 1);
  if (/^-?0o[0-7]+$/i.test(t)) return parseInt(t.replace(/0o/i, ""), 8) * (t.startsWith("-") ? -1 : 1);
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const pct = t.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (pct) return Number(pct[1]) / 100;
  if (/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(t)) return Number(t);
  // bare hex such as "B6", "FF" or "2F3h" / "2F3 base 16" (has a letter, so it can't be decimal)
  const hex = t.replace(/(h|₁₆|\(16\)|_16|base16)$/i, "");
  if (/^[0-9a-f]{2,}$/i.test(hex) && /[a-f]/i.test(hex)) return parseInt(hex, 16);
  return null;
}

// "6 ns", "9 J", "3.5 m/s" and "6ns": the number, without its unit (code prints bare numbers)
function withUnit(token: string) {
  return token.match(/^(-?\d[\d.]*(?:e-?\d+)?)\s*[a-zµΩ°]{1,4}(?:\/[a-z]{1,3})?$/i);
}
function withoutUnit(token: string): number | null {
  const m = withUnit(token);
  return m ? toNumber(m[1]) : null;
}

// "x = 2, x = 3" and "3, 2" both become ["2", "3"]; "0x2F3" and "755" both become ["755"]
function tokens(answer: string, kind: Question["kind"]) {
  let a = answer.trim().replace(/^(answer|ans)\s*[:=]\s*/i, "").replace(/\*\*/g, "");
  if (kind === "mcq") {
    const letter = a.match(/^\(?([A-Fa-f])\)?(?:[).:\s]|$)/);
    return [letter ? letter[1].toUpperCase() : a.toLowerCase()];
  }
  if (kind === "code") return [a.replace(/\s+$/g, "")];
  a = a.replace(/\b[a-z]\s*=\s*/gi, "").replace(/[{}[\]]/g, "");
  return a
    .split(/\s*(?:,(?!\d{3}\b)|;|\bor\b|\band\b)\s*/i)
    .map((t) => t.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((t) => {
      // with a space, "6 db" is 6 decibels, not the hex number 0x6DB
      const n = /\s/.test(t) && withUnit(t) ? withoutUnit(t) : (toNumber(t) ?? withoutUnit(t));
      return n === null ? t.toLowerCase().replace(/\s+/g, "") : String(Math.round(n * 1e9) / 1e9);
    })
    .sort();
}

// compares distinct values, so "0x2F, 47, 0b101111" (one value written three ways) matches "47, 0b101111"
export function sameAnswer(a: string, b: string, kind: Question["kind"]) {
  const x = [...new Set(tokens(a, kind))];
  const y = [...new Set(tokens(b, kind))];
  return x.length === y.length && x.every((t, i) => t === y[i]);
}

// every number written in some program output, normalised like answer tokens
function numbersIn(output: string) {
  const found = output.match(/-?0x[0-9a-f]+|-?0b[01]+|-?\d+(?:\.\d+)?(?:\/-?\d+(?:\.\d+)?)?(?:e-?\d+)?%?/gi) ?? [];
  return new Set(found.map((t) => toNumber(t)).filter((n): n is number => n !== null).map((n) => String(Math.round(n * 1e9) / 1e9)));
}

// true when an answer is backed by what the code actually printed: each value appears in the output
export function groundedIn(answer: string, output: string, kind: Question["kind"], options: string[] = []) {
  const flat = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  if (kind === "mcq") {
    const letter = tokens(answer, "mcq")[0];
    const option = options[letter.charCodeAt(0) - 65];
    return !!option && flat(output).includes(flat(option));
  }
  if (kind === "code") return flat(output).includes(flat(answer));
  const printed = numbersIn(output);
  const wanted = tokens(answer, kind);
  return wanted.length > 0 && wanted.every((t) => printed.has(t) || flat(output).includes(t));
}
