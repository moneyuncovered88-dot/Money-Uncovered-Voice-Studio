"use client";

import { useState } from "react";

import { AdminTable, fmtDateTime } from "@/components/admin/admin-table";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";

const FILTERS = ["all", "generating", "completed", "failed"] as const;

export default function AdminJobsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const { data, loading } = useApiData(
    () => api.admin.jobs(filter === "all" ? undefined : filter),
    [filter],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="Recent generation jobs across all users." />

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable
          head={["Status", "Chunks", "GPU s", "Cost", "Created", "Completed"]}
          rows={(data ?? []).map((j) => [
            <Badge key="s" variant={j.status === "failed" ? "destructive" : "muted"}>
              {j.status}
            </Badge>,
            String(j.total_chunks ?? "—"),
            String(j.gpu_seconds ?? "—"),
            j.estimated_cost != null ? `$${j.estimated_cost}` : "—",
            fmtDateTime(j.created_at),
            fmtDateTime(j.completed_at),
          ])}
          empty="No jobs match this filter."
        />
      )}
    </div>
  );
}
