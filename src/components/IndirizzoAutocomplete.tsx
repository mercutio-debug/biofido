"use client";

import { useEffect, useRef, useState } from "react";
import { searchIndirizzi, type IndirizzoSuggerimento } from "@/lib/geo";

/**
 * Campo indirizzo con autocompletamento: digitando "via roma" propone
 * "Via Roma, Torino", "Via Roma, Milano"… Alla scelta restituisce le coordinate
 * esatte (per posizionare il segnaposto). Si può poi rifinire trascinando il pin.
 */
export function IndirizzoAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: IndirizzoSuggerimento) => void;
  placeholder?: string;
}) {
  const [sugg, setSugg] = useState<IndirizzoSuggerimento[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNext = useRef(false); // evita la ricerca subito dopo una selezione
  const typed = useRef(false); // cerca solo dopo che l'utente ha digitato

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (!typed.current) return;
    if (!value || value.trim().length < 3) {
      setSugg([]);
      setOpen(false);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      const r = await searchIndirizzi(value);
      setLoading(false);
      setSugg(r);
      setHi(-1);
      setOpen(r.length > 0);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(s: IndirizzoSuggerimento) {
    skipNext.current = true;
    onChange(s.label);
    onSelect(s);
    setOpen(false);
    setSugg([]);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="field"
        value={value}
        placeholder={placeholder ?? "Es. Via Roma 1, Torino"}
        autoComplete="off"
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => sugg.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || sugg.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, sugg.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && hi >= 0) {
            e.preventDefault();
            pick(sugg[hi]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-900/40">
          🔎
        </span>
      )}
      {open && sugg.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[#cfe3b4] bg-white py-1 shadow-lg">
          {sugg.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setHi(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === hi ? "bg-leaf text-green-900" : "text-green-900/90"
              }`}
            >
              📍 {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
