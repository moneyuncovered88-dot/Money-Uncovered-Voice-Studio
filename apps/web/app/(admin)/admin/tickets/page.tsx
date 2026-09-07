"use client";

import { Ticket as TicketIcon } from "lucide-react";

import { AdminTable, fmtDateTime } from "@/components/admin/admin-table";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";

export default function AdminTicketsPage() {
  const { data, loading } = useApiData(() => api.admin.tickets(), []);

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets" description="Support requests submitted by users." />

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable
          head={["Topic", "Message", "Status", "Created"]}
          rows={(data ?? []).map((t) => [
            t.topic ?? "—",
            <span key="m" className="line-clamp-1 block max-w-[420px]">
              {t.message}
            </span>,
            <Badge key="s" variant="muted">
              {t.status}
            </Badge>,
            fmtDateTime(t.created_at),
          ])}
          empty={
            <span className="inline-flex items-center gap-2">
              <TicketIcon className="h-4 w-4" /> No support tickets yet.
            </span>
          }
        />
      )}
    </div>
  );
}
