"use client";

import { useEffect, useState } from "react";
import { formatPrezzo } from "@/lib/prezzo";

/**
 * Casella per importi in euro. Mentre digiti accetta solo cifre e separatori;
 * quando esci dal campo (blur) formatta in automatico con simbolo € e due
 * decimali ("15" → "€ 15,00"). Va usata in TUTTE le caselle dove si inserisce
 * una somma. Emette il valore formattato al genitore solo al blur, così non
 * disturba la digitazione.
 */
export function ImportoInput({
  value,
  onChange,
  placeholder,
  className,
  required,
  id,
}: {
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}) {
  const [text, setText] = useState(value ?? "");
  // sincronizza se il valore cambia dall'esterno (es. caricamento dati)
  useEffect(() => {
    setText(value ?? "");
  }, [value]);

  return (
    <input
      id={id}
      className={className ?? "field mt-1"}
      inputMode="decimal"
      value={text}
      placeholder={placeholder ?? "€ 0,00"}
      required={required}
      // durante la digitazione lascio cifre, virgola, punto, € e spazi
      onChange={(e) => setText(e.target.value.replace(/[^\d.,€\s]/g, ""))}
      onBlur={() => {
        const f = formatPrezzo(text);
        setText(f);
        onChange(f);
      }}
    />
  );
}
