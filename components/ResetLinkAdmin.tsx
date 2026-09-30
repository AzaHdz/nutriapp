"use client";

import { useState, useTransition } from "react";
import { generateResetLink } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ResetLinkAdmin({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await generateResetLink(fd);
      if (r.ok) setUrl(r.url);
      else setError(r.error);
    });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Button size="sm" variant="secondary" onClick={generate} disabled={pending}>
        {pending ? "Generando…" : url ? "Generar otro link" : "Generar link de restablecimiento"}
      </Button>

      {url && (
        <>
          <div className="flex gap-2">
            <Input readOnly value={url} className="flex-1 font-mono text-[11px]" onFocus={(e) => e.target.select()} />
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? "Copiado ✓" : "Copiar"}
            </Button>
          </div>
          <p className="text-[11.5px] text-text-3">
            Válido 1 hora, un solo uso. Compárteselo por WhatsApp o correo; al abrirlo
            podrá crear una contraseña nueva.
          </p>
        </>
      )}
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
