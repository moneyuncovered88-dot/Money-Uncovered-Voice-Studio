"use client";

import { AdminTable, fmtDateTime } from "@/components/admin/admin-table";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const { data, loading } = useApiData(() => api.admin.users(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="All accounts, their plan, and recent activity."
        actions={data ? <Badge variant="muted">{data.length} users</Badge> : null}
      />

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable
          head={["Email", "Plan", "Joined", "Last sign-in"]}
          rows={(data ?? []).map((u) => [
            u.email ?? "—",
            <span key="p" className="capitalize">
              {u.plan}
            </span>,
            fmtDateTime(u.created_at),
            fmtDateTime(u.last_sign_in_at || null),
          ])}
          empty="No users found. Ensure the backend has the Supabase service role key set."
        />
      )}
    </div>
  );
}
