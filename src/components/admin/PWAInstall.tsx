"use client";

import { useEffect, useState } from "react";
import { IconDownload, IconWifiSlash } from "@/components/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Module 7 - PWA affordances. Registers the service worker, surfaces
 * the beforeinstallprompt as an install button, and shows an Offline
 * badge when the browser drops the network. Mounted once in the admin
 * shell so the diary (and every admin surface) benefits.
 */
export default function PWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // Start "online" on both server and client so SSR HTML matches
  // hydration; the window online/offline events correct it after mount.
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Register lazily; the SW only caches diary navigations and
      // static assets, so a failed registration is non-fatal.
      void navigator.serviceWorker
        .register("/sw.js")
        .then(() => undefined)
        .catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const onOnline = () => setOnline(navigator.onLine);
    const onOffline = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferred(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!online && (
        <span
          role="status"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[#b3402e] bg-[rgba(179,64,46,0.1)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b3402e]"
        >
          <IconWifiSlash size={12} />
          Offline
        </span>
      )}
      {installed && (
        <span className="inline-flex rounded-[var(--radius-control)] border border-[#2e7d52] bg-[rgba(46,125,82,0.1)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#2e7d52]">
          Installed
        </span>
      )}
      {deferred && !installed && (
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[#c0964f] bg-[var(--accent-soft)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep hover:border-[var(--accent-deep)] transition-colors"
        >
          <IconDownload size={12} />
          Install app
        </button>
      )}
    </div>
  );
}
