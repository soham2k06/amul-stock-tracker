import { Button } from "@/components/ui/button";
import { ProductAvailability } from "@/types/amul";
import { Bell, Check, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { PriceBlock, StockBadge } from "./components";

function ProductCardList({
  p,
  subscribed,
  loading,
  onToggle,
}: {
  p: ProductAvailability;
  subscribed: boolean;
  loading?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="milk-card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex gap-4 sm:contents">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-cream to-secondary/40 sm:h-28 sm:w-28">
          {p.imageUrl ? (
            <Image
              src={p.imageUrl}
              alt={p.name}
              fill
              sizes="112px"
              className="object-contain p-2"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://shop.amul.com/s/62fa94df8c13af2e242eba16/6891949ed2419bd45fff586b/01-hero-image-multipack.png";
              }}
            />
          ) : (
            <div className="h-full w-full rounded-xl bg-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <StockBadge p={p} />
          <h3 className="mt-1 text-sm font-semibold sm:truncate sm:text-base">
            {p.name}
          </h3>
          <div className="mt-2">
            <PriceBlock p={p} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:w-44">
        <Button
          className={`h-11 flex-1 sm:flex-none gap-1.5 rounded-xl ${
            subscribed ? "bg-success hover:bg-success/90" : ""
          }`}
          disabled={loading}
          onClick={onToggle}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : subscribed ? (
            <>
              <Check className="h-4 w-4" /> Notifying
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" /> Notify me
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="h-11 flex-1 sm:flex-none gap-1.5 rounded-xl"
          nativeButton={false}
          render={
            <a href={p.productUrl} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-4 w-4" /> View
            </a>
          }
        ></Button>
      </div>
    </div>
  );
}

export default ProductCardList;
