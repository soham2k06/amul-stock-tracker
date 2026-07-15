import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Subscription } from "@prisma/client";
import { BellRing, ExternalLink, MapPin, Trash2 } from "lucide-react";

function SubscriptionRow({
  sub,
  onRemove,
  disabled,
}: {
  sub: Pick<Subscription, "id" | "productName" | "pincode"> & {
    lastNotifiedAt: string | null;
  };
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="milk-card group flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-accent/20 text-primary">
        <BellRing className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="truncate mb-1 font-semibold">{sub.productName}</h3>
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {sub.pincode}
          </span>
          <span>
            {sub.lastNotifiedAt &&
              `Last notified ${formatDateTime(sub.lastNotifiedAt)}`}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl gap-1.5"
          nativeButton={false}
          render={
            <a
              href={`https://shop.amul.com/en/browse/protein?q=${encodeURIComponent(sub.productName)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink className="h-4 w-4" />
              View
            </a>
          }
        ></Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="rounded-xl gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Unsubscribe
        </Button>
      </div>
    </div>
  );
}

export default SubscriptionRow;
