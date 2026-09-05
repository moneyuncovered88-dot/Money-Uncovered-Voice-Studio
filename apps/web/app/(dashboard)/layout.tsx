import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let email: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? null;
  } catch (err) {
    // `redirect` throws a control-flow signal — re-throw it.
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/login");
  }

  return <AppShell email={email}>{children}</AppShell>;
}
