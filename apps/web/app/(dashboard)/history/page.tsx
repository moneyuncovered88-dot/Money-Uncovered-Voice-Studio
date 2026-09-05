"use client";

import { History } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generation History"
        description="A record of every narration generation — date, voice, duration, and cost."
      />
      <Card>
        <CardContent className="p-4">
          <EmptyState
            icon={History}
            title="No generations yet"
            description="Generation history appears here once the job engine is live and you run your first narration."
          />
        </CardContent>
      </Card>
    </div>
  );
}
