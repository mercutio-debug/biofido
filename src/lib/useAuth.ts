"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, ADMIN_EMAIL } from "./supabase";

/** Hook client per conoscere lo stato di login dell'utente. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Mantieni STABILE l'oggetto sessione finché l'utente è lo stesso.
      // Eventi come TOKEN_REFRESHED scattano al rientro sulla scheda del
      // browser: se ricreassimo `session`/`user`, gli effetti agganciati a
      // `user` ripartirebbero, ricaricando e SVUOTANDO i form non salvati.
      setSession((prev) => (prev?.user?.id === s?.user?.id ? prev : s));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const isAdmin =
    !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return { session, user, isAdmin, loading };
}
