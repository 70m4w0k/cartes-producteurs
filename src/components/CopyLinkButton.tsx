"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost w-full justify-center"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copiez le lien :", window.location.href);
        }
      }}
    >
      🔗 {copied ? "Lien copié" : "Copier le lien de cette page"}
    </button>
  );
}
