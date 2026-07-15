import type { ReactNode } from "react";
import { SECRET } from "./leakDetect";

// Wrap every plaintext occurrence of the secret in a highlight, so a leak is
// visible proof rather than a claim. (Obfuscated leaks are reported by method.)
export function highlightSecret(text: string): ReactNode {
  if (!text) return text;
  const lower = text.toLowerCase();
  const target = SECRET.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(target, i);
  let k = 0;
  while (idx !== -1) {
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark key={k++} className="leak-mark">
        {text.slice(idx, idx + SECRET.length)}
      </mark>
    );
    i = idx + SECRET.length;
    idx = lower.indexOf(target, i);
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}
