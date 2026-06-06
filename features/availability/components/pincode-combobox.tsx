"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { PincodeRecord } from "@/types/amul";

type Props = {
  value: string;
  onChange: (pincode: string) => void;
};

export function PincodeCombobox({ value, onChange }: Props) {
  const [options, setOptions] = useState<PincodeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchOptions(digits: string) {
    setLoading(true);
    setOptions([]);
    try {
      const res = await fetch(`/api/pincodes?q=${digits}`);
      if (res.ok) {
        const json = await res.json();
        setOptions(json.records ?? []);
      }
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputValueChange(inputVal: string) {
    const digits = inputVal.replace(/\D/g, "").slice(0, 6);
    if (digits.length < 3) {
      setOptions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOptions(digits), 300);
  }

  return (
    <Combobox<string>
      items={options.map((r) => r.pincode)}
      filter={() => true}
      value={value || null}
      onValueChange={(val) => onChange(val ?? "")}
      onInputValueChange={handleInputValueChange}
    >
      <ComboboxInput
        id="pincode"
        inputMode="numeric"
        placeholder="e.g. 395004"
        showClear={!!value}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxList>
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          )}
          {options.map((record) => (
            <ComboboxItem key={record.pincode} value={record.pincode}>
              <span className="font-medium">{record.pincode}</span>
              <span className="ml-auto text-xs capitalize text-muted-foreground">
                {record.substore.replace(/-/g, " ")}
              </span>
            </ComboboxItem>
          ))}
          {!loading && <ComboboxEmpty>No results found</ComboboxEmpty>}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
