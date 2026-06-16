"use client";

import { useEffect, useRef, useState } from "react";
import { loadComuni, searchComuni, type Comune } from "@/lib/comuni";

/**
 * Campo con autocomplete sui comuni italiani: digiti le prime lettere e
 * compaiono i suggerimenti con provincia e regione. Alla scelta restituisce il
 * comune (con coordinate) tramite onSelect.
 */
export function ComuneAutocomplete({
  value,
  onSelect,
  placeholder,
}: {
  value?: string;
  onSelect: (c: Comune) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const [list, setList] = useState<Comune[]>([]);
  const [sugg, setSugg] = useState<Comune[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComuni().then(setList);
  }, []);
  useEffect(() => {
    setText(value ?? "");
  }, [value]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onType(v: string) {
    setText(v);
    const s = searchComuni(list, v);
    setSugg(s);
    setOpen(s.length > 0);
    setHi(0);
  }
  function pick(c: Comune) {
    setText(`${c.nome} (${c.prov})`);
    setOpen(false);
    onSelect(c);
  }

  return (
    <div ref={ref} className="relative">
      <input
        className="field"
        value={text}
        placeholder={placeholder ?? "Inizia a scrivere la città…"}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => {
          if (sugg.length) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, sugg.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (sugg[hi]) pick(sugg[hi]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[#cfe0bb] bg-white shadow-lg"
        >
          {sugg.map((c, i) => (
            <li
              key={`${c.nome}-${c.prov}`}
              role="option"
              aria-selected={i === hi}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === hi ? "bg-leaf" : ""}`}
            >
              <span className="font-semibold text-green-800">{c.nome}</span>
              <span className="text-green-900/60">
                {" "}
                ({c.prov}) — {c.regione}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
