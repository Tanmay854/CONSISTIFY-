import { Capacitor } from "@capacitor/core";
import { runBackHandler } from "./backHandler";

/**
 * Native (Capacitor) shell setup. Everything here is a no-op on the web build,
 * so the deployed website behaves exactly as before.
 */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // App is a black theme -> light (white) status bar content, overlaying the webview
    // so our env(safe-area-inset-top) padding controls the layout.
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* plugin unavailable */
  }

  // Android hardware / gesture back button: close the top-most overlay first,
  // then fall back to history, and only exit the app at the root.
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (runBackHandler()) return;
      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }
      App.exitApp();
    });
  } catch {
    /* plugin unavailable */
  }

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setAccessoryBarVisible({ isVisible: false });

    // Keep the focused input visible when the keyboard appears.
    Keyboard.addListener("keyboardDidShow", () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  } catch {
    /* plugin unavailable */
  }

  // Open external links in the in-app browser instead of navigating the app away.
  document.addEventListener(
    "click",
    (e) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      const isExternal = /^https?:$/.test(url.protocol) && url.origin !== window.location.origin;
      if (!isExternal) return;
      e.preventDefault();
      import("@capacitor/browser")
        .then(({ Browser }) => Browser.open({ url: url.href }))
        .catch(() => window.open(url.href, "_blank"));
    },
    true,
  );
}
