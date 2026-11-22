"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Copies `text` to the clipboard and shows "Copiado ✓" for 2 seconds. Copying
 * never changes anything on the server.
 *
 * If the Clipboard API is missing or rejects (some mobile browsers, non-HTTPS),
 * it shows the text in a read-only, pre-selected textarea to copy by hand.
 */
export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Select the whole text as soon as the fallback appears.
  useEffect(() => {
    if (!fallback) return;
    const el = textareaRef.current;
    el?.focus();
    el?.select();
    el?.setSelectionRange(0, text.length); // iOS ignores select() on read-only fields
  }, [fallback, text]);

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setFallback(false);
      setCopied(true);
    } catch {
      setFallback(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Button type="button" size="sm" variant="secondary" onClick={copy}>
          {label}
        </Button>
        <span role="status" className="text-sm text-success">
          {copied ? "Copiado ✓" : ""}
        </span>
      </div>

      {fallback && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11.5px] text-text-3">
            No se pudo copiar automáticamente. El texto ya está seleccionado: cópialo a mano.
          </p>
          <textarea
            ref={textareaRef}
            readOnly
            value={text}
            rows={8}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-ctl border border-border-strong bg-surface-2 px-2.5 py-2 font-mono text-[12px] text-text"
          />
          <button
            type="button"
            onClick={() => setFallback(false)}
            className="self-start text-xs font-semibold text-text-2 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
