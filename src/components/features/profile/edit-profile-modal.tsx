"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function EditProfileModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (profile && open) {
      setName(profile.name);
      setBio(profile.bio);
      setWebsite(profile.website ?? "");
      setLocation(profile.location ?? "");
    }
  }, [profile, open]);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      name,
      bio,
      website: website || null,
      location: location || null,
    });
    setSaving(false);
    toast.success("Profile updated");
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-strong rounded-2xl border border-border/60 shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h2 className="text-base font-semibold">Edit profile</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-lg">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 rounded-2xl">
                  {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.name} /> : null}
                  <AvatarFallback className="text-xl">{profile.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">@{profile.username}</div>
                  <div>{profile.email}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Display name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-lg" placeholder="Your name" />
              </div>

              <div>
                <Label className="text-xs">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="mt-1 rounded-lg resize-none"
                  placeholder="Tell people what you're about…"
                  maxLength={200}
                />
                <div className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/200</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 rounded-lg" placeholder="yoursite.com" />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 rounded-lg" placeholder="City, Country" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-lg gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save changes
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
