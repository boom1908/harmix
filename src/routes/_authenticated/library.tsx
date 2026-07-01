import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, ListMusic } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — Loop" },
      { name: "description", content: "Your playlists." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data: playlists, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id, name, description, created_at, playlist_items(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("playlists").insert({
      user_id: u.user.id,
      name: name.trim(),
      description: desc.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Playlist created");
    setName("");
    setDesc("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["playlists"] });
    qc.invalidateQueries({ queryKey: ["playlists-simple"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
          <p className="text-sm text-muted-foreground">Playlists you've made</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New playlist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create playlist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pl-name">Name</Label>
                <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My chill mix" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-desc">Description (optional)</Label>
                <Input id="pl-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {playlists && playlists.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ListMusic className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-3 font-medium">No playlists yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Create one to start collecting tracks.</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(playlists ?? []).map((p) => (
          <Link
            key={p.id}
            to="/playlist/$id"
            params={{ id: p.id }}
            className="group rounded-xl border border-border bg-surface p-3 transition hover:bg-accent"
          >
            <div className="mb-3 grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/5">
              <ListMusic className="h-8 w-8 text-primary" />
            </div>
            <div className="truncate text-sm font-medium">{p.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {p.playlist_items?.[0]?.count ?? 0} tracks
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
