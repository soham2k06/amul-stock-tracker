import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";

function ChannelCard({
  title,
  description,
  enabled,
  onToggle,
  onTest,
  actionLabel,
  icon,
  accent,
  disabled,
  busy,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  onTest: () => void;
  actionLabel: string;
  icon: React.ReactNode;
  accent: "primary" | "accent";
  disabled?: boolean;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const ring =
    accent === "primary" ? "from-primary to-accent" : "from-accent to-primary";
  const isInteractionDisabled = disabled || busy;
  return (
    <div className="milk-card relative overflow-hidden rounded-3xl p-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${ring} text-primary-foreground shadow-md`}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                {enabled ? (
                  <Badge className="gap-1 bg-success/15 text-success border border-success/30">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-muted-foreground"
                  >
                    <XCircle className="h-3 w-3" /> Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={isInteractionDisabled}
          />
        </div>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={onTest}
            disabled={isInteractionDisabled || !enabled}
          >
            <Send className="h-4 w-4" /> Send test
          </Button>
          <Button
            className="rounded-xl gap-1.5"
            variant={enabled ? "outline" : "default"}
            onClick={onToggle}
            disabled={isInteractionDisabled}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionLabel}
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ChannelCardSkeleton() {
  return (
    <div className="milk-card relative overflow-hidden rounded-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-5 w-8 rounded-2xl" />
      </div>

      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />

      <div className="mt-5 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export default ChannelCard;
export { ChannelCardSkeleton };