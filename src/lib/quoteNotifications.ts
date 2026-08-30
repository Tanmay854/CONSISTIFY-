import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { findCategory, subLabel } from "@/lib/quoteTopics";

/**
 * Daily quote notifications (native only).
 *
 * Local notifications are scheduled ahead of time, one per slot, each carrying a
 * DIFFERENT quote from the topic / subtopic the (anonymous) user picked in the
 * Quotes tab. Whenever the user changes topic or subtopic we re-schedule from
 * scratch so the upcoming notifications match the new selection.
 */

const CAT_KEY = "daily_quote_cat";
const SUB_KEY = "daily_quote_sub";
/** Explicit notification topic chosen in Quotes → Notification (wins over the browsing topic). */
const NOTIF_CAT_KEY = "notif_quote_cat";
const NOTIF_SUB_KEY = "notif_quote_sub";
export const NOTIF_ENABLED_KEY = "quote_notifications_enabled";
const CURSOR_KEY = "quote_notifications_cursor";

/** Every 3 hours from 6am through 9pm (inside the 6am-11pm window). */
const SLOT_HOURS = [6, 9, 12, 15, 18, 21];
/** How many upcoming notifications to keep queued (~8 days). */
const QUEUE_SIZE = 48;

const CHANNEL_ID = "daily_quotes";

const isNative = () => Capacitor.isNativePlatform();

export const notificationsEnabled = () => {
  try {
    return localStorage.getItem(NOTIF_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
};

export const setNotificationsEnabled = (on: boolean) => {
  try {
    localStorage.setItem(NOTIF_ENABLED_KEY, on ? "true" : "false");
  } catch {
    /* empty */
  }
};

const validTopic = (cat: string | null, sub: string | null) => {
  if (!cat || !sub) return null;
  if (!findCategory(cat)?.subs.some((s) => s.id === sub)) return null;
  return { cat, sub };
};

/** The subtopic explicitly chosen for notifications, if any. */
export const getNotificationTopic = () => {
  try {
    return validTopic(localStorage.getItem(NOTIF_CAT_KEY), localStorage.getItem(NOTIF_SUB_KEY));
  } catch {
    return null;
  }
};

/** Pick the subtopic notifications should pull quotes from. */
export const setNotificationTopic = (cat: string, sub: string) => {
  try {
    localStorage.setItem(NOTIF_CAT_KEY, cat);
    localStorage.setItem(NOTIF_SUB_KEY, sub);
  } catch {
    /* empty */
  }
  void scheduleQuoteNotifications();
};

/** Notification topic falls back to whatever the user is browsing. */
const readTopic = () => {
  const explicit = getNotificationTopic();
  if (explicit) return explicit;
  try {
    return validTopic(localStorage.getItem(CAT_KEY), localStorage.getItem(SUB_KEY));
  } catch {
    return null;
  }
};

/** Deterministic shuffle so a given rotation is stable but varied. */
const shuffle = <T,>(arr: T[], seed: number) => {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Upcoming slot datetimes, starting from the next slot after now. */
const upcomingSlots = (count: number) => {
  const now = new Date();
  const out: Date[] = [];
  for (let day = 0; out.length < count && day < 30; day++) {
    for (const h of SLOT_HOURS) {
      const d = new Date(now);
      d.setDate(now.getDate() + day);
      d.setHours(h, 0, 0, 0);
      if (d.getTime() > now.getTime() + 60_000) out.push(d);
      if (out.length >= count) break;
    }
  }
  return out;
};

/** Ask for permission once (native only). Returns true when granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
    return perm.display === "granted";
  } catch {
    return false;
  }
}

export async function cancelQuoteNotifications() {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    /* empty */
  }
}

/**
 * Re-schedules the upcoming queue of quote notifications for the currently
 * selected topic / subtopic. Safe to call often — it always cancels first.
 */
export async function scheduleQuoteNotifications(): Promise<void> {
  if (!isNative()) return;
  if (!notificationsEnabled()) {
    await cancelQuoteNotifications();
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const topic = readTopic();

  // No topic picked yet -> still notify, just pull from all quotes.
  let query = supabase.from("daily_quotes").select("text,author").limit(500);
  if (topic) query = query.eq("category", topic.cat).eq("subcategory", topic.sub);
  let { data, error } = await query;

  let quotes = (data || []).filter((q) => !!q.text);
  if (topic && (error || !quotes.length)) {
    // Selected subtopic has no quotes -> fall back to the whole library.
    const res = await supabase.from("daily_quotes").select("text,author").limit(500);
    data = res.data;
    error = res.error;
    quotes = (data || []).filter((q) => !!q.text);
  }
  if (!quotes.length) return;

  let cursor = 0;
  try {
    cursor = Number(localStorage.getItem(CURSOR_KEY)) || 0;
  } catch {
    /* empty */
  }

  const slots = upcomingSlots(QUEUE_SIZE);
  const title = topic ? subLabel(topic.cat, topic.sub) : "Daily Motivation";


  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Android 8+ needs a channel.
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "Daily Quotes",
        description: "Motivational quotes through the day",
        importance: 4,
        visibility: 1,
      });
    } catch {
      /* iOS / unsupported */
    }

    await cancelQuoteNotifications();

    // Walk the shuffled deck; reshuffle with a new seed each full pass so no
    // two consecutive notifications repeat a quote.
    const notifications = slots.map((at, i) => {
      const pass = Math.floor((cursor + i) / quotes.length);
      const deck = shuffle(quotes, pass + 1);
      const q = deck[(cursor + i) % quotes.length];
      const body = q.author ? `${q.text}\n— ${q.author}` : q.text;
      return {
        id: 10_000 + i,
        title,
        body,
        largeBody: body,
        summaryText: title,
        channelId: CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
        extra: { category: topic?.cat ?? null, subcategory: topic?.sub ?? null },
      };
    });

    try {
      await LocalNotifications.schedule({ notifications });
    } catch {
      // Android 12+ can refuse exact alarms -> retry inexact.
      await LocalNotifications.schedule({
        notifications: notifications.map((n) => ({ ...n, schedule: { at: n.schedule.at } })),
      });
    }

    try {
      localStorage.setItem(CURSOR_KEY, String((cursor + slots.length) % quotes.length));
    } catch {
      /* empty */
    }

  } catch {
    /* plugin unavailable */
  }
}

/** Called when the user changes topic / subtopic in the Quotes tab. */
export function refreshQuoteNotifications() {
  void scheduleQuoteNotifications();
}
