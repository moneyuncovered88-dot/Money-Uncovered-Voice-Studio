"use client";

import { useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePersistentValue } from "@/lib/use-persistent-value";
import { cn } from "@/lib/utils";

export function AppShell({ email, children }: { email: string | null; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedRaw, setCollapsedRaw] = usePersistentValue("mus-sidebar-collapsed", "0");
  const collapsed = collapsedRaw === "1";

  function toggleCollapsed() {
    setCollapsedRaw(collapsed ? "0" : "1");
  }

  const renderSidebar = (opts?: { onNavigate?: () => void; isCollapsed?: boolean }) => {
    const isCollapsed = opts?.isCollapsed ?? false;
    return (
      <div className="flex h-full flex-col">
        <div className={cn("flex items-center py-5", isCollapsed ? "justify-center px-2" : "px-5")}>
          <Brand collapsed={isCollapsed} />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav onNavigate={opts?.onNavigate} collapsed={isCollapsed} />
        </div>
        <div className="space-y-1 border-t border-border p-3">
          <ThemeToggle collapsed={isCollapsed} />
          <UserMenu email={email} collapsed={isCollapsed} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card/60 transition-[width] duration-200 md:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {renderSidebar({ isCollapsed: collapsed })}
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className="absolute -right-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground md:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
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
            {renderSidebar({ onNavigate: () => setMobileOpen(false) })}
          </DialogContent>
        </Dialog>
      </header>

      {/* Main content — full-width, generous padding, capped for readability */}
      <main className={cn("transition-[padding] duration-200", collapsed ? "md:pl-16" : "md:pl-64")}>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
