"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { SettingsCard } from "./controls";
import { PushToggle } from "../../components/PushToggle";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function InstallSection() {
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const update = () => setStandalone(isStandalone());
    queueMicrotask(() => {
      update();
      setIos(isIOS());
    });
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <SettingsCard title="Install & notifications" hint="Add the hub to your home screen so notifications can work">
      {standalone === false ? (
        <div className="flex items-start gap-3 rounded-tile border border-hairline px-4 py-3">
          <Share size={18} className="mt-0.5 shrink-0 text-tint" aria-hidden />
          <div>
            <div className="text-[15px] font-semibold">Add to your home screen</div>
            <p className="mt-1 text-[13px] leading-snug text-ink-2">
              {ios
                ? "Notifications only work once the hub is installed. In Safari, tap Share, then “Add to Home Screen.”"
                : "Install the hub to your home screen for the best experience and reliable notifications."}
            </p>
          </div>
        </div>
      ) : null}
      <PushToggle />
    </SettingsCard>
  );
}
