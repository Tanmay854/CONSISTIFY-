import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Entitlement = {
  premium: boolean;
  ad_free: boolean;
  plan: string | null;
  status: string | null;
  provider: string | null;
  expires_at: string | null;
  cancel_at_period_end: boolean | null;
};

export type AdSettings = {
  ads_enabled: boolean;
  video_pre_roll_enabled: boolean;
  video_mid_roll_enabled: boolean;
  video_mid_roll_interval: number;
  feed_ad_frequency: number;
  photo_ad_frequency: number;
  quote_ad_frequency: number;
  book_ad_frequency: number;
  audio_ad_frequency: number;
  interstitial_enabled: boolean;
};

const EMPTY: Entitlement = {
  premium: false,
  ad_free: false,
  plan: null,
  status: null,
  provider: null,
  expires_at: null,
  cancel_at_period_end: null,
};

const DEFAULT_ADS: AdSettings = {
  ads_enabled: true,
  video_pre_roll_enabled: true,
  video_mid_roll_enabled: false,
  video_mid_roll_interval: 600,
  feed_ad_frequency: 8,
  photo_ad_frequency: 10,
  quote_ad_frequency: 10,
  book_ad_frequency: 3,
  audio_ad_frequency: 0,
  interstitial_enabled: false,
};

type Ctx = {
  entitlement: Entitlement;
  adSettings: AdSettings;
  premium: boolean;
  adFree: boolean;
  loading: boolean;
  /** True when Consistify's own ads may be shown to this viewer. */
  shouldShowAds: boolean;
  refresh: () => Promise<void>;
  /** Opens the Consistify Premium page. */
  openPaywall: () => void;
  closePaywall: () => void;
  paywallOpen: boolean;
};

const PremiumContext = createContext<Ctx | undefined>(undefined);

export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement>(EMPTY);
  const [adSettings, setAdSettings] = useState<AdSettings>(DEFAULT_ADS);
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (!user) {
      setEntitlement(EMPTY);
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc("my_entitlement" as never);
    const e = (data ?? null) as Partial<Entitlement> | null;
    setEntitlement({ ...EMPTY, ...(e ?? {}) });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ad_settings" as never).select("*").maybeSingle();
      if (data) setAdSettings({ ...DEFAULT_ADS, ...(data as unknown as AdSettings) });
    })();
  }, []);

  const value = useMemo<Ctx>(() => {
    const premium = !!entitlement.premium;
    return {
      entitlement,
      adSettings,
      premium,
      adFree: premium,
      loading,
      shouldShowAds: !premium && adSettings.ads_enabled,
      refresh,
      openPaywall: () => setPaywallOpen(true),
      closePaywall: () => setPaywallOpen(false),
      paywallOpen,
    };
  }, [entitlement, adSettings, loading, refresh, paywallOpen]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
};

export const usePremium = (): Ctx => {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    // Allows components to be rendered outside the provider (e.g. isolated previews).
    return {
      entitlement: EMPTY,
      adSettings: DEFAULT_ADS,
      premium: false,
      adFree: false,
      loading: false,
      shouldShowAds: true,
      refresh: async () => {},
      openPaywall: () => {},
      closePaywall: () => {},
      paywallOpen: false,
    };
  }
  return ctx;
};
