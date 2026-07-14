"use client";

import { useState } from "react";
import { Bell, Compass, LogOut, Milk, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import type { ServerSession } from "@/lib/get-server-session";
import { useSession } from "@/hooks/use-session";
import { usePincodeParam, withPincode } from "@/hooks/use-pincode-param";
import { SignInDialog } from "@/features/availability/sign-in-dialog";

export function SiteHeader({
  initialSession,
}: {
  initialSession?: ServerSession;
}) {
  const pathname = usePathname();
  const pincode = usePincodeParam();
  const [signInOpen, setSignInOpen] = useState(false);
  const { data: session } = useSession(initialSession);

  async function handleSignOut() {
    await authClient.signOut();
    window.location.reload();
  }

  const link = (to: string, label: string) => {
    const active = pathname === to;
    return (
      <Link
        href={withPincode(to, pincode)}
        className={`relative px-3 py-2 text-sm font-medium transition-colors ${
          active ? "text-primary" : "text-foreground/70 hover:text-foreground"
        }`}
      >
        {label}
        {active && (
          <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href={withPincode("/", pincode)}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent shadow-md shadow-primary/25">
            <Milk
              className="h-5 w-5 text-primary-foreground"
              strokeWidth={2.5}
            />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold tracking-tight">
              Amul<span className="text-primary">Alert</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              never miss a restock
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {link("/", "Browse")}
          {link("/subscriptions", "Subscriptions")}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full shadow-sm max-sm:size-10"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-40 truncate">
                      {session.user.displayUsername ?? session.user.username}
                    </span>
                  </Button>
                }
              ></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="max-w-56 truncate">
                    {session.user.displayUsername ?? session.user.username}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              className="gap-2 rounded-full shadow-sm"
              onClick={() => setSignInOpen(true)}
            >
              <User className="h-4 w-4" />
              Sign in
            </Button>
          )}
        </div>
      </div>

      <div className="absolute -bottom-12 right-0 z-10 flex items-center gap-1 rounded-full rounded-r-none border border-border/60 bg-background p-1 shadow-lg sm:right-6 md:hidden">
        <Link
          href={withPincode("/", pincode)}
          aria-label="Browse"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            pathname === "/"
              ? "bg-primary text-primary-foreground"
              : "text-foreground/60 hover:text-foreground",
          )}
        >
          <Compass className="h-4 w-4" />
        </Link>
        <Link
          href={withPincode("/subscriptions", pincode)}
          aria-label="Subscriptions"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            pathname === "/subscriptions"
              ? "bg-primary text-primary-foreground"
              : "text-foreground/60 hover:text-foreground",
          )}
        >
          <Bell className="h-4 w-4" />
        </Link>
      </div>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </header>
  );
}
