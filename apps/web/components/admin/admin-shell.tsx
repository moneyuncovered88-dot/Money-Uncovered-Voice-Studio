"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminShell({ email, children }: { email: string | null; children: ReactNode }) {
  const router = useRouter();
  const { data: me, loading } = useApiData(() => api.account.me(), []);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!me?.is_admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-lg font-semibold">Admin access required</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This area is restricted to platform administrators.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/80 md:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gold/15 ring-1 ring-gold/40">
            <span className="h-3 w-3 rounded-sm bg-gold" />
          </span>
          <div className="leading-none">
            <div className="text-sm font-semibold tracking-tight">MUS Voices</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-gold">Admin</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <AdminSidebarNav />
        </div>

        <div className="space-y-1 border-t border-border p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="truncate">{email ?? "Sign out"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">MUS Voices</span>
          <span className="text-[11px] font-medium uppercase text-gold">Admin</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Back to app</Link>
        </Button>
      </header>

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
