"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AppShell({ email, children }: { email: string | null; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderSidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-border p-3">
        <UserMenu email={email} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/60 md:block">
        {renderSidebar()}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-0 top-0 h-full max-w-[17rem] translate-x-0 translate-y-0 rounded-none border-r p-0 sm:rounded-none">
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            {renderSidebar(() => setMobileOpen(false))}
          </DialogContent>
        </Dialog>
      </header>

      {/* Main content */}
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
