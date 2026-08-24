import {
  Activity, AlertTriangle, Anchor, Apple, Bed, BookOpen, Brain, Briefcase, Building2, Camera,
  Church, Clock, CloudLightning, CloudRain, Coffee, Coins, Compass, CreditCard, Cross, Crosshair,
  Crown, Dumbbell, EyeOff, Feather, Fingerprint, Flag, Flame, Flower2, Footprints, Gem, Gift,
  GraduationCap, Hammer, Hand, HandHeart, Handshake, Headphones, Heart, HeartCrack, HeartHandshake,
  HeartOff, HeartPulse, Home, Hourglass, Infinity, Landmark, Laugh, Leaf, LifeBuoy, Lightbulb,
  ListChecks, MessageCircle, Mic, Moon, Mountain, Orbit, PartyPopper, PiggyBank, Plane, Rainbow,
  Recycle, RefreshCw, Repeat, Ribbon, Rocket, Scale, Search, Shield, ShieldAlert, ShieldCheck,
  Smile, Sparkle, Sparkles, Sprout, Star, Store, Sun, Sunrise, Swords, Target, Timer, TrendingUp,
  Trophy, User, Users, Wallet, Waves, Wind, Wine, Zap,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Activity, AlertTriangle, Anchor, Apple, Bed, BookOpen, Brain, Briefcase, Building2, Camera,
  Church, Clock, CloudLightning, CloudRain, Coffee, Coins, Compass, CreditCard, Cross, Crosshair,
  Crown, Dumbbell, EyeOff, Feather, Fingerprint, Flag, Flame, Flower2, Footprints, Gem, Gift,
  GraduationCap, Hammer, Hand, HandHeart, Handshake, Headphones, Heart, HeartCrack, HeartHandshake,
  HeartOff, HeartPulse, Home, Hourglass, Infinity, Landmark, Laugh, Leaf, LifeBuoy, Lightbulb,
  ListChecks, MessageCircle, Mic, Moon, Mountain, Orbit, PartyPopper, PiggyBank, Plane, Rainbow,
  Recycle, RefreshCw, Repeat, Ribbon, Rocket, Scale, Search, Shield, ShieldAlert, ShieldCheck,
  Smile, Sparkle, Sparkles, Sprout, Star, Store, Sun, Sunrise, Swords, Target, Timer, TrendingUp,
  Trophy, User, Users, Wallet, Waves, Wind, Wine, Zap,
};

const QuoteIcon = ({ name, size = 16 }: { name?: string; size?: number }) => {
  const Cmp = (name && MAP[name]) || Sparkles;
  return <Cmp size={size} strokeWidth={1.75} className="text-foreground/85" />;
};

export default QuoteIcon;
