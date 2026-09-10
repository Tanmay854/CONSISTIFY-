import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Crown, Lock } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { useAuth } from "@/hooks/useAuth";
import { useBackHandler } from "@/lib/backHandler";

const BENEFITS = [
  "Premium motivational videos",
  "Full book summaries",
  "Book audio",
  "Premium photos and quotes",
  "Ad-free Consistify experience",
  "Exclusive content",
];

type Plan = "monthly" | "yearly";

/** Full-screen Consistify Premium page. */
const PremiumSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { entitlement, premium, refresh } = usePremium();
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [notice, setNotice] = useState<string | null>(null);

  useBackHandler(open, onClose);

  const startCheckout = () => {
    if (!user) {
      setNotice("Please sign in first so your Premium stays with your account.");
      return;
    }
    setNotice("Checkout is not connected yet. Payments will go live once the payment provider is set up.");
  };

  const restore = async () => {
    await refresh();
    setNotice("Your membership status has been refreshed.");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[120] bg-background overflow-y-auto overscroll-contain scrollbar-hide touch-pan-y"
        >
          <div className="px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <X size={16} className="text-foreground" />
            </button>

            <div className="mt-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
                <Crown className="text-primary" />
              </div>
              <h1 className="text-foreground text-3xl font-extrabold tracking-tight">Consistify Premium</h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                Unlock everything and enjoy Consistify completely ad-free.
              </p>
            </div>

            {premium ? (
              <div className="mt-8 rounded-2xl border border-primary/40 bg-primary/10 p-5">
                <p className="text-foreground font-semibold">You are a Premium member.</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <Line label="Plan" value={entitlement.plan ?? "Premium"} />
                  <Line label="Status" value={entitlement.status ?? "active"} />
                  <Line label="Provider" value={entitlement.provider ?? "—"} />
                  <Line
                    label="Renews / expires"
                    value={entitlement.expires_at ? new Date(entitlement.expires_at).toLocaleDateString() : "—"}
                  />
                  <Line label="Ad-free" value="Yes" />
                </dl>
              </div>
            ) : (
              <>
                <div className="mt-8 space-y-3">
                  <PlanCard
                    active={plan === "yearly"}
                    onClick={() => setPlan("yearly")}
                    title="Yearly"
                    price="₹699"
                    per="/year"
                    tag="Best value"
                    sub="Just ₹58 a month"
                  />
                  <PlanCard
                    active={plan === "monthly"}
                    onClick={() => setPlan("monthly")}
                    title="Monthly"
                    price="₹99"
                    per="/month"
                    sub="Cancel anytime"
                  />
                </div>

                <button
                  onClick={startCheckout}
                  className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tracking-wide active:scale-[0.98] transition-transform"
                >
                  GET PREMIUM
                </button>
                <button onClick={restore} className="mt-3 w-full text-muted-foreground text-xs">
                  Restore purchase
                </button>
              </>
            )}

            {notice && <p className="mt-4 text-center text-xs text-muted-foreground">{notice}</p>}

            <ul className="mt-8 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground text-sm">{b}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-muted-foreground text-[11px] leading-relaxed">
              Enjoy a clean, ad-free Consistify experience while using our Spotify-powered music section.
              Consistify Premium does not change Spotify's own service, playback rules or advertising, and it
              is not Spotify Premium.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-foreground font-medium capitalize">{value}</dd>
  </div>
);

const PlanCard = ({
  active, onClick, title, price, per, tag, sub,
}: { active: boolean; onClick: () => void; title: string; price: string; per: string; tag?: string; sub?: string }) => (
  <button
    onClick={onClick}
    className={`w-full text-left rounded-2xl border p-4 transition-colors ${
      active ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-foreground font-bold">{title}</span>
      {tag && (
        <span className="text-[10px] uppercase tracking-wider font-bold text-primary-foreground bg-primary rounded-full px-2 py-0.5">
          {tag}
        </span>
      )}
    </div>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="text-foreground text-2xl font-extrabold">{price}</span>
      <span className="text-muted-foreground text-xs">{per}</span>
    </div>
    {sub && <p className="text-muted-foreground text-[11px] mt-1">{sub}</p>}
  </button>
);

/** Inline lock card shown where premium content would appear. */
export const PremiumLock = ({ title = "Premium Content", className = "" }: { title?: string; className?: string }) => {
  const { openPaywall } = usePremium();
  return (
    <div className={`rounded-2xl border border-border bg-secondary/40 p-6 text-center ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-primary/15 mx-auto flex items-center justify-center mb-3">
        <Lock size={18} className="text-primary" />
      </div>
      <p className="text-foreground font-bold">{title}</p>
      <p className="text-muted-foreground text-sm mt-1">Unlock this content with Consistify Premium.</p>
      <p className="text-foreground text-sm font-semibold mt-3">₹99/month · ₹699/year</p>
      <button
        onClick={openPaywall}
        className="mt-4 h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-bold tracking-wide active:scale-[0.98] transition-transform"
      >
        GET PREMIUM
      </button>
    </div>
  );
};

export default PremiumSheet;
