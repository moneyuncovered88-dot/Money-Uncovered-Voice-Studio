"use client";

import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api, ApiRequestError } from "@/lib/api";

export default function AdminFlagsPage() {
  const { data, loading, reload } = useApiData(() => api.admin.featureFlags(), []);

  async function toggle(key: string, enabled: boolean) {
    try {
      await api.admin.setFlag(key, enabled);
      toast.success("Flag updated");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not update flag");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Global switches. Changes take effect immediately for all users."
      />

      <Card>
        <CardHeader>
          <CardTitle>Switches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-32" />
          ) : (
            (data ?? []).map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.key}</p>
                </div>
                <Button
                  size="sm"
                  variant={f.enabled ? "default" : "outline"}
                  onClick={() => toggle(f.key, !f.enabled)}
                >
                  {f.enabled ? "On" : "Off"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
