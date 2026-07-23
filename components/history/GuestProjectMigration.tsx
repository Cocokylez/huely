"use client";

import { useEffect, useRef } from "react";
import { migrateGuestProjects } from "@/lib/history/save";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Runs once after an authenticated layout hydrates. Guest records move to the
 * account automatically; full-resolution sources and canvas photos stay local.
 */
export function GuestProjectMigration({ authed }: { authed: boolean }) {
  const started = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authed || started.current) return;
    started.current = true;

    let active = true;
    migrateGuestProjects()
      .then(({ moved, alreadyCloud, failed }) => {
        if (!active || (!moved && !alreadyCloud && !failed)) return;

        window.dispatchEvent(new Event("huely-history-changed"));
        const completed = moved + alreadyCloud;
        if (failed) {
          toast(
            completed
              ? `${completed} project${completed === 1 ? "" : "s"} synced · ${failed} will retry`
              : `Couldn't sync ${failed} guest project${failed === 1 ? "" : "s"} yet`,
          );
        } else {
          toast(`${completed} guest project${completed === 1 ? "" : "s"} moved to your account`);
        }
      })
      .catch(() => {
        if (active) toast("Guest projects are safe on this device · sync will retry");
      });

    return () => {
      active = false;
    };
  }, [authed, toast]);

  return null;
}
