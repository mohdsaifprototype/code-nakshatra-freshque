import { Bell, Leaf, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

export default function Settings() {
  const { user, vegetarianOnly, setVegetarianOnly } = useAuth();
  const [pushOn, setPushOn] = useState(false);

  const enablePush = async () => {
    if (!("Notification" in window)) return toast.error("Browser doesn't support notifications");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPushOn(true);
      toast.success("Notifications enabled. We'll alert you 48h before items spoil.");
    } else {
      toast.error("Permission denied");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in-up">
      <div className="bento-tile">
        <div className="font-display text-xl">Profile</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Name</div>
            <div className="font-medium">{user?.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Email</div>
            <div className="font-medium truncate">{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="bento-tile flex items-center gap-4">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <Leaf className="size-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Vegetarian only</div>
          <div className="text-xs text-muted-foreground">All recipe suggestions stay strictly veg-compliant.</div>
        </div>
        <Switch
          checked={vegetarianOnly}
          onCheckedChange={async (checked) => {
            try {
              await setVegetarianOnly(checked);
            } catch (e: any) {
              toast.error(e?.message || "Failed to save preference");
            }
          }}
        />
      </div>

      <div className="bento-tile flex items-center gap-4">
        <div className="size-10 rounded-xl bg-accent/15 text-accent grid place-items-center">
          <Bell className="size-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Browser push alerts</div>
          <div className="text-xs text-muted-foreground">Get nudged 48h before food spoils. Powered by VAPID web push.</div>
        </div>
        <Switch 
          checked={pushOn} 
          onCheckedChange={async (checked) => {
            if (checked) {
              await enablePush();
            } else {
              setPushOn(false);
              toast.success("Notifications disabled.");
            }
          }} 
        />
      </div>

    </div>
  );
}
