import { ProductAvailability } from "@/types/amul";
import Image from "next/image";
import { PriceBlock, StockBadge } from "./components";
import { Button } from "@/components/ui/button";
import { BellRing, Check, ExternalLink, Loader2 } from "lucide-react";

function ProductCardGrid({
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
    <div className="milk-card group relative flex flex-col overflow-hidden rounded-2xl transition">
      <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-cream to-secondary/40">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, 320px"
            className="object-contain p-6 transition duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://shop.amul.com/s/62fa94df8c13af2e242eba16/6891949ed2419bd45fff586b/01-hero-image-multipack.png";
            }}
          />
        ) : (
          <div className="h-full w-full rounded-xl bg-muted" />
        )}
        <div className="absolute left-3 top-3">
          <StockBadge p={p} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 min-h-12 text-sm font-semibold leading-snug">
          {p.name}
        </h3>
        <PriceBlock p={p} />
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            className={`flex-1 gap-1.5 rounded-xl ${
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
                <BellRing className="h-4 w-4" /> Notify me
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            aria-label="View on Amul"
            nativeButton={false}
            render={
              <a href={p.productUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-4 w-4" />
              </a>
            }
          ></Button>
        </div>
      </div>
    </div>
  );
}

export default ProductCardGrid;