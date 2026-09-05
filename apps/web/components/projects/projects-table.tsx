"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import type { ProjectListItem } from "@/types/api";

interface ProjectsTableProps {
  projects: ProjectListItem[];
  voiceName?: (id: string | null) => string;
  onChanged?: () => void;
}

export function ProjectsTable({ projects, voiceName, onChanged }: ProjectsTableProps) {
  const router = useRouter();

  async function duplicate(id: string) {
    try {
      const created = await api.projects.duplicate(id);
      toast.success("Project duplicated");
      router.push(`/projects/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not duplicate project");
    }
  }

  async function remove(id: string) {
    try {
      await api.projects.remove(id);
      toast.success("Project deleted");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not delete project");
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Status</TableHead>
          {voiceName ? <TableHead>Voice</TableHead> : null}
          <TableHead className="text-right">Words</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => {
          const duration = p.final_duration_seconds ?? p.estimated_duration_seconds ?? 0;
          return (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/projects/${p.id}`} className="font-medium hover:text-primary">
                  {p.title}
                </Link>
                {p.video_title ? (
                  <p className="truncate text-xs text-muted-foreground">{p.video_title}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              {voiceName ? (
                <TableCell className="text-sm text-muted-foreground">
                  {voiceName(p.voice_profile_id)}
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums">
                {p.word_count.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {p.final_duration_seconds ? formatDuration(duration) : `~${formatDuration(duration)}`}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(p.updated_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Project actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${p.id}`}>Open</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate(p.id)}>
                      <Copy className="h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Download className="h-4 w-4" /> Download (after generation)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <ConfirmDialog
                      trigger={
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      }
                      title="Delete project?"
                      description="This permanently removes the project and its script. This cannot be undone."
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => remove(p.id)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
