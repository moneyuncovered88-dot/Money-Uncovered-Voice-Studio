"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Plan = {
  key: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  tagline: string;
  highlight?: boolean;
  cta: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    tagline: "Try MUS Voices with ads.",
    cta: "Current plan",
    features: [
      "10,000 characters / month",
      "1 voice profile",
      "Short previews",
      "Standard queue",
      "Ads supported",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    priceMonthly: 9,
    priceYearly: 90,
    tagline: "For regular creators.",
    cta: "Upgrade",
    features: [
      "150,000 characters / month",
      "3 voice profiles",
      "No ads",
      "Full narration exports",
      "MP3 + WAV downloads",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: 29,
    priceYearly: 290,
    tagline: "For serious YouTube automation.",
    highlight: true,
    cta: "Upgrade",
    features: [
      "750,000 characters / month",
      "10 voice profiles + voice reference",
      "Priority generation queue",
      "Chunk regeneration",
      "Commercial use",
    ],
  },
  {
    key: "business",
    name: "Business",
    priceMonthly: 79,
    priceYearly: 790,
    tagline: "For studios and agencies.",
    cta: "Contact us",
    features: [
      "3,000,000 characters / month",
      "Unlimited voice profiles",
      "Highest priority queue",
      "Team workspaces (soon)",
      "Priority support",
    ],
  },
];

export default function PlansPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Plans"
        description="Simple pricing for long-form AI narration. Upgrade any time."
        actions={
          <div className="inline-flex items-center rounded-md border border-border p-1 text-sm">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                !yearly ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                yearly ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              Yearly <span className="text-xs opacity-80">−17%</span>
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const price = yearly ? plan.priceYearly : plan.priceMonthly;
          const suffix = plan.priceMonthly === 0 ? "" : yearly ? "/yr" : "/mo";
          return (
            <Card
              key={plan.key}
              className={cn(
                "flex flex-col",
                plan.highlight ? "border-primary/50 ring-1 ring-primary/30" : "",
              )}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.highlight ? <Badge variant="gold">Popular</Badge> : null}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">${price}</span>
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlight ? "gold" : plan.key === "free" ? "outline" : "default"}
                  className="mt-auto w-full"
                  disabled={plan.key === "free"}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Billing is not enabled yet — these tiers preview the plan structure. Checkout arrives with
        the payments release.
      </p>
    </div>
  );
}
