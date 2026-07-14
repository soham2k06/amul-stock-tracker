import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/constants/query-keys";
import { SUBSTORES } from "@/lib/constants";
import { ProductAvailability, PincodeRecord } from "@/types/amul";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PincodeCombobox } from "./pincode-combobox";

const PINCODE_RE = /^\d{6}$/;

export const PINCODES = [
  { code: "400001", city: "Mumbai", state: "Maharashtra" },
  { code: "110001", city: "New Delhi", state: "Delhi" },
  { code: "560001", city: "Bengaluru", state: "Karnataka" },
  { code: "500001", city: "Hyderabad", state: "Telangana" },
  { code: "600001", city: "Chennai", state: "Tamil Nadu" },
  { code: "411001", city: "Pune", state: "Maharashtra" },
  { code: "395004", city: "Surat", state: "Gujarat" },
  { code: "700001", city: "Kolkata", state: "West Bengal" },
];

function PincodePanel({
  pincode,
  setPincode,
  pending,
}: {
  pincode: string;
  setPincode: (v: string) => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(pincode);

  const hasPincode = PINCODE_RE.test(pincode);

  const { data, isLoading: isSubstoreLoading } = useQuery<{
    records: PincodeRecord[];
  }>({
    queryKey: QUERY_KEYS.pincodes(pincode),
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/pincodes?q=${pincode}`, { signal });
      if (!res.ok) return { records: [] };
      return res.json();
    },
    enabled: hasPincode,
    staleTime: 5 * 60 * 1000,
  });

  const record = data?.records.find((r) => r.pincode === pincode);
  const substoreName = record
    ? (SUBSTORES.find((s) => s.alias === record.substore)?.name ??
      record.substore)
    : undefined;

  return (
    <div className="milk-card relative rounded-3xl p-6 overflow-hidden">
      <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <MapPin className="h-3.5 w-3.5" />
          Delivery pincode
        </div>
        {hasPincode ? (
          <>
            <div className="mt-3 font-display text-4xl font-semibold">
              {pincode}
            </div>
            {isSubstoreLoading ? (
              <Skeleton className="mt-1 h-4 w-24" />
            ) : (
              substoreName && (
                <div className="text-sm text-muted-foreground">
                  {substoreName}
                </div>
              )
            )}
          </>
        ) : pending ? (
          <>
            <Skeleton className="mt-3 h-10 w-32" />
            <Skeleton className="mt-1.5 h-4 w-24" />
          </>
        ) : (
          <div className="mt-3 font-display text-2xl text-muted-foreground">
            Not set yet
          </div>
        )}

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setDraft(pincode);
          }}
        >
          <DialogTrigger
            render={
              <Button className="mt-5 w-full h-11 rounded-xl">
                {hasPincode ? "Change pincode" : "Set pincode"}
              </Button>
            }
          ></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delivery pincode</DialogTitle>
              <DialogDescription>
                Enter your 6-digit pincode to see what&apos;s available near
                you.
              </DialogDescription>
            </DialogHeader>
            <PincodeCombobox value={draft} onChange={setDraft} />
            <div className="flex flex-wrap gap-2">
              {PINCODES.map((p) => (
                <button
                  key={p.code}
                  onClick={() => setDraft(p.code)}
                  className="rounded-full border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary transition"
                >
                  {p.city} · {p.code}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button
                disabled={!PINCODE_RE.test(draft)}
                onClick={() => {
                  setPincode(draft);
                  setOpen(false);
                  toast.success(`Pincode set to ${draft}`);
                }}
              >
                Save pincode
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 w-full justify-center sm:justify-start sm:w-fit rounded-sm px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StockBadge({ p }: { p: ProductAvailability }) {
  if (!p.available) {
    return (
      <div className="bg-background w-fit rounded-xl h-6 relative inline-flex">
        <Badge
          variant="secondary"
          className="gap-1 bg-destructive/10 text-destructive border-destructive/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Out of stock
        </Badge>
      </div>
    );
  }
  const low = (p.inventoryQuantity ?? 0) < 10;
  return (
    <div className="bg-background w-fit rounded-xl h-6 relative inline-flex">
      <Badge
        className={`gap-1 border ${
          low
            ? "bg-warning/15 text-warning-foreground border-warning/30"
            : "bg-success/15 text-success border-success/30"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            low ? "bg-warning" : "bg-success"
          }`}
        />
        {low
          ? `Only ${p.inventoryQuantity} left`
          : `In stock · ${p.inventoryQuantity}`}
      </Badge>
    </div>
  );
}

function PriceBlock({ p }: { p: ProductAvailability }) {
  const off =
    (p.mrp ?? 0) > (p.price ?? 0)
      ? Math.round((((p.mrp ?? 0) - (p.price ?? 0)) / (p.mrp ?? 0)) * 100)
      : 0;
  return (
    <div className="flex items-baseline gap-2">
      <div className="font-display text-xl font-semibold">₹{p.price}</div>
      {off > 0 && (
        <>
          <div className="text-xs text-muted-foreground line-through">
            ₹{p.mrp}
          </div>
          <div className="text-xs font-semibold text-success">{off}% off</div>
        </>
      )}
    </div>
  );
}

export { PincodePanel, ViewToggle, StockBadge, PriceBlock };
