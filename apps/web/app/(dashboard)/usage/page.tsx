"use client";

import { BarChart3, Clock, FolderOpen, HardDrive, Info } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsagePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage"
        description="Track your characters, generated minutes, projects, and storage against your plan."
        actions={<Badge variant="muted">Free plan</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Characters Used" value="—" hint="This billing period" icon={BarChart3} />
        <StatCard label="Minutes Generated" value="—" hint="Final audio minutes" icon={Clock} />
        <StatCard label="Projects" value="—" hint="Created" icon={FolderOpen} />
        <StatCard label="Storage Used" value="—" hint="Audio + references" icon={HardDrive} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly characters</span>
              <span className="font-medium">0 / 10,000</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-0 rounded-full bg-primary" />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Usage metering is being wired up. Once live, this page shows real-time consumption,
            your next reset date, and a daily trend chart.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
