import { ScanLine, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ScanReceiptTile() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/scan")}
      className="bento-tile col-span-12 md:col-span-6 xl:col-span-4 text-left group"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="flex items-start justify-between text-primary-foreground">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary-foreground/70">Gemini multimodal</div>
          <div className="font-display text-2xl mt-2 leading-tight">
            Snap a receipt,<br />stock the pantry.
          </div>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-primary-foreground/90">
            <Camera className="size-4" />
            Auto-extract names, qty & ₹ prices
          </div>
        </div>
        <div className="size-12 rounded-2xl bg-white/15 grid place-items-center group-hover:bg-white/25 transition">
          <ScanLine className="size-6 text-white" />
        </div>
      </div>
    </button>
  );
}
