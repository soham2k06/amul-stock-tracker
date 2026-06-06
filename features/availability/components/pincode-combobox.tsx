"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type PincodeRecord = {
  pincode: string;
  substore: string;
};

type Props = {
  value: string;
  onChange: (pincode: string) => void;
};

export function PincodeCombobox({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [options, setOptions] = useState<PincodeRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInputChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setInputValue(digits);
    setActiveIndex(-1);

    // If user cleared or typed a full exact match, fire onChange immediately
    if (digits.length === 0) {
      onChange("");
      setOptions([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (digits.length < 3) {
      setOptions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pincodes?q=${digits}`);
        if (!res.ok) {
          setOptions([]);
          return;
        }
        const json = await res.json();
        const records: PincodeRecord[] = json.records ?? [];
        setOptions(records);
        setOpen(records.length > 0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function selectOption(record: PincodeRecord) {
    setInputValue(record.pincode);
    onChange(record.pincode);
    setOpen(false);
    setOptions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectOption(options[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const isSelected = value !== "" && value === inputValue;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-10 items-center rounded-lg border bg-white px-3 gap-2",
          "border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900",
          "focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-50"
        )}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          id="pincode"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 395004"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => options.length > 0 && setOpen(true)}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" />
        ) : (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </div>

      {open && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          style={{ maxHeight: "200px" }}
        >
          {options.map((record, i) => (
            <li
              key={record.pincode}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(record);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
                i === activeIndex
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {record.pincode}
              </span>
              <span className="text-xs capitalize text-zinc-400 dark:text-zinc-600">
                {record.substore}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Hidden input for form validation - ensures a selected pincode is exact 6 digits */}
      <input
        type="text"
        name="pincode-value"
        value={value}
        readOnly
        required
        pattern="\d{6}"
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 h-0 w-0 opacity-0 pointer-events-none"
      />

      {isSelected && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
          Selected
        </p>
      )}
    </div>
  );
}
