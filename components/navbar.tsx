"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignInDialog } from "@/features/availability/components/sign-in-dialog";

export function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [signInOpen, setSignInOpen] = useState(false);

  async function handleLogout() {
    await authClient.signOut();
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          Amul Stock Notifier
        </Link>

        {!isPending && (
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <Link href="/subscriptions">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Subscriptions
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 pl-1.5 pr-2"
                      />
                    }
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground select-none">
                      {(session.user.name?.[0] ?? session.user.email[0]).toUpperCase()}
                    </div>
                    <span className="hidden max-w-28 truncate text-sm sm:block">
                      {session.user.name || session.user.email}
                    </span>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      {session.user.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button size="sm" onClick={() => setSignInOpen(true)}>
                Sign in
              </Button>
            )}
          </div>
        )}
      </div>

      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSuccess={() => router.refresh()}
      />
    </header>
  );
}
