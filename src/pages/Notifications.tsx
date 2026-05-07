import { useEffect } from "react";
import { AlertTriangle, Bell, CheckCheck, IndianRupee, ScanLine, ShieldCheck, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type NotificationKind } from "@/contexts/NotificationsContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const kindMeta: Record<NotificationKind, { label: string; icon: typeof Bell; color: string }> = {
  spoilage: { label: "Spoilage alert", icon: AlertTriangle, color: "bg-expiry-critical/10 text-expiry-critical" },
  financial: { label: "Financial risk", icon: IndianRupee, color: "bg-amber-500/10 text-amber-600" },
  intake: { label: "Receipt scan", icon: ScanLine, color: "bg-primary/10 text-primary" },
  replenishment: { label: "Auto-restock", icon: ShoppingCart, color: "bg-emerald-500/10 text-emerald-600" },
  security: { label: "Security", icon: ShieldCheck, color: "bg-sky-500/10 text-sky-600" },
};

export default function Notifications() {
  const { notifications, markAllRead, remove, clear } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Pantry, financial, and security alerts powered by the Web Push service.
          </p>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="size-4 mr-1" /> Clear all
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bento-tile text-center py-12">
          <div className="size-12 mx-auto rounded-2xl bg-muted grid place-items-center">
            <CheckCheck className="size-6 text-muted-foreground" />
          </div>
          <div className="mt-3 font-medium">You're all caught up</div>
          <p className="text-sm text-muted-foreground mt-1">
            New alerts will appear here as your pantry, scans, and account activity change.
          </p>
        </div>
      ) : (
        <div className="bento-tile p-0 overflow-hidden">
          <ul className="divide-y">
            {notifications.map((n) => {
              const meta = kindMeta[n.kind];
              const Icon = meta.icon;
              return (
                <li key={n.id} className={cn(!n.read && "bg-primary/5")}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className={cn("size-9 rounded-xl grid place-items-center shrink-0", meta.color)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{meta.label}</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-0.5 font-medium text-sm">{n.title}</div>
                      <div className="text-sm text-muted-foreground">{n.body}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      aria-label="Delete notification"
                      className="shrink-0 size-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
