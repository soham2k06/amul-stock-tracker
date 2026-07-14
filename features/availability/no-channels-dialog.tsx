"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribeAnyway: () => void;
};

export function NoChannelsDialog({ open, onOpenChange, onSubscribeAnyway }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>No notification channels enabled</DialogTitle>
          <DialogDescription>
            You haven&apos;t enabled push, Telegram, or email notifications, so
            you won&apos;t be alerted when this product comes back in stock.
            Enable a channel to actually get notified.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onSubscribeAnyway();
              onOpenChange(false);
            }}
          >
            Subscribe anyway
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/subscriptions">Enable a channel</Link>}
          ></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
