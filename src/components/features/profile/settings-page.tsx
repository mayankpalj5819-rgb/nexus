"use client";

import { useSignedInUser } from "@/lib/use-signed-in-user";
import * as React from "react";
import { useNexusStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogOut, Save, RefreshCw, Moon, Sun, Shield, Database, Github } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export function SettingsPage() {
  const signedInUser = useSignedInUser();
  const updateProfile = useNexusStore((s) => s.updateProfile);
  const signOut = useNexusStore((s) => s.signOut);
  const setView = useNexusStore((s) => s.setView);
  const { theme, setTheme } = useTheme();

  const [name, setName] = React.useState(signedInUser?.name ?? "");
  const [bio, setBio] = React.useState(signedInUser?.bio ?? "");
  const [website, setWebsite] = React.useState(signedInUser?.website ?? "");
  const [location, setLocation] = React.useState(signedInUser?.location ?? "");
  const [avatar, setAvatar] = React.useState(signedInUser?.avatar ?? "");
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!signedInUser) return null;

  const handleSave = () => {
    updateProfile({ name, bio, website, location, avatar });
    toast.success("Profile updated");
  };

  const handleAvatarRefresh = () => {
    const seeds = ["Aurora","Neo","Quasar","Vega","Lyra","Orion","Pulsar","Nebula","Helios","Atlas","Rigel","Cosmo"];
    const seed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 100);
    const url = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}`;
    setAvatar(url);
    updateProfile({ avatar: url });
    toast.success("Avatar refreshed");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      {/* Profile section */}
      <section className="glass-card rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4">Profile</h2>

        <div className="flex items-center gap-4 mb-5">
          <Avatar className="w-20 h-20 rounded-2xl">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-2xl">{name[0]}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={handleAvatarRefresh} className="rounded-lg gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh avatar
            </Button>
            <p className="text-xs text-muted-foreground">Avatars are generated from your Google account.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-lg" />
          </div>
          <div>
            <Label className="text-xs">Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 rounded-lg resize-none" placeholder="Tell people what you're about…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 rounded-lg" placeholder="yoursite.com" />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 rounded-lg" placeholder="City, Country" />
            </div>
          </div>
          <Button onClick={handleSave} className="rounded-lg gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save changes
          </Button>
        </div>
      </section>

      {/* Appearance */}
      <section className="glass-card rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4">Appearance</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border-2 transition-colors ${mounted && theme === "light" ? "border-primary" : "border-border hover:border-border/80"}`}
          >
            <Sun className="w-5 h-5 mb-2 mx-auto" />
            <div className="text-sm font-medium">Light</div>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border-2 transition-colors ${mounted && theme === "dark" ? "border-primary" : "border-border hover:border-border/80"}`}
          >
            <Moon className="w-5 h-5 mb-2 mx-auto" />
            <div className="text-sm font-medium">Dark</div>
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="glass-card rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <div className="font-medium">Username</div>
              <div className="text-xs text-muted-foreground">@{signedInUser.username}</div>
            </div>
            <span className="text-xs text-muted-foreground">Immutable</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <div className="font-medium">Email</div>
              <div className="text-xs text-muted-foreground">{signedInUser.email}</div>
            </div>
            <span className="text-xs text-muted-foreground">From Google</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <div className="font-medium">Role</div>
              <div className="text-xs text-muted-foreground capitalize">{signedInUser.role}</div>
            </div>
            <span className="text-xs text-muted-foreground">Assigned</span>
          </div>
        </div>
      </section>

      {/* System info */}
      <section className="glass-card rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4">System</h2>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Phase 1 MVP · Google OAuth · Supabase RLS
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5" /> Supabase Postgres · Row Level Security enabled
          </div>
          <div className="flex items-center gap-2">
            <Github className="w-3.5 h-3.5" /> Next.js 16 · TypeScript · Tailwind · shadcn/ui
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="glass-card rounded-2xl p-5 border border-destructive/30">
        <h2 className="text-sm font-semibold mb-2 text-destructive">Sign out</h2>
        <p className="text-xs text-muted-foreground mb-3">You can sign back in any time with your Google account.</p>
        <Button
          variant="outline"
          onClick={() => { signOut(); toast.success("Signed out"); }}
          className="rounded-lg gap-1.5 text-destructive hover:text-destructive"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out of Nexus
        </Button>
      </section>

      <div className="mt-8 text-center">
        <Button variant="ghost" onClick={() => setView({ name: "home", feed: "trending" })} className="text-xs">
          Back to Nexus
        </Button>
      </div>
    </div>
  );
}
