/**
 * Minimal markdown renderer shared by the coach thread and the insight detail pages: bold, bullet/numbered
 * lists and line breaks only, no dependency. Plain function (no "use client"), safe from server or client.
 */
import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>;
  });
}

const BULLET_RE = /^\s*[-*]\s+/;
const NUMBERED_RE = /^\s*\d+[.)]\s+/;

export function renderMarkdownLite(text: string): ReactNode {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        items.push(lines[i].replace(BULLET_RE, ""));
        i++;
      }
      const k = key++;
      blocks.push(
        <ul key={`ul-${k}`} className="list-disc space-y-0.5 pl-5">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `uli-${k}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (NUMBERED_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBERED_RE.test(lines[i])) {
        items.push(lines[i].replace(NUMBERED_RE, ""));
        i++;
      }
      const k = key++;
      blocks.push(
        <ol key={`ol-${k}`} className="list-decimal space-y-0.5 pl-5">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `oli-${k}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !BULLET_RE.test(lines[i]) && !NUMBERED_RE.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    const k = key++;
    blocks.push(
      <p key={`p-${k}`}>
        {para.map((l, idx) => (
          <Fragment key={idx}>
            {idx > 0 ? <br /> : null}
            {renderInline(l, `pl-${k}-${idx}`)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <>{blocks}</>;
}
