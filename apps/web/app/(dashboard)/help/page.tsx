"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiRequestError } from "@/lib/api";

const FAQ = [
  {
    q: "Why is my first generation slow?",
    a: "The first request after idle wakes a GPU and warms the model, which can take a minute or two. After that, generations are fast until the worker scales back down.",
  },
  {
    q: "How do I make a voice sound slower?",
    a: "Pick a slower narration style (Calm or Slow), or lower the Speed setting. Speed is pitch-preserving, so the voice stays natural.",
  },
  {
    q: "Can I use my own narrator voice?",
    a: "Yes. Add a Voice Profile and upload a short reference recording you're authorized to use. Generations then match that voice.",
  },
  {
    q: "What are the usage limits?",
    a: "Free accounts have a monthly character allowance and show ads. Paid plans raise limits, remove ads, and add priority generation.",
  },
];

export default function HelpPage() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please describe your issue.");
      return;
    }
    setSaving(true);
    try {
      await api.account.createTicket({ topic: topic || null, message: message.trim() });
      toast.success("Thanks — your request has been submitted.");
      setTopic("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not submit your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Help"
        description="Get support, report an issue, or browse common questions."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" /> Contact support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="Billing, generation issue, feature request…"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  placeholder="Describe what you need help with."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Submitting…" : "Submit request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="space-y-1">
                <p className="text-sm font-medium">{item.q}</p>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
