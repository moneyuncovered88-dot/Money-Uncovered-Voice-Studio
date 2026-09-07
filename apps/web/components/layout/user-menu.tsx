"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UserMenu({
  email,
  collapsed = false,
}: {
  email: string | null;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const initial = (email ?? "?").charAt(0).toUpperCase();
  const { data: me } = useApiData(() => api.account.me(), []);

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={collapsed ? "w-full justify-center px-0" : "w-full justify-start gap-3 px-3"}
          title={collapsed ? (email ?? "Account") : undefined}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {initial}
          </span>
          {!collapsed ? (
            <span className="truncate text-sm text-muted-foreground">{email ?? "Account"}</span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{email ?? "Signed in"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {me?.is_admin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4" />
              Admin console
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={signOut} disabled={loading}>
          <LogOut className="h-4 w-4" />
          {loading ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
