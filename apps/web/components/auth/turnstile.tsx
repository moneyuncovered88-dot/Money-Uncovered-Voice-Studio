"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
}

/**
 * Cloudflare Turnstile widget. Renders nothing unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so signup works with or without
 * CAPTCHA configured. Pair with Supabase's CAPTCHA setting; the captured token
 * is passed to supabase.auth.signUp({ options: { captchaToken } }).
 */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const render = (): boolean => {
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!ts || !containerRef.current || cancelled || rendered.current) {
        return Boolean(rendered.current);
      }
      rendered.current = true;
      ts.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onTokenRef.current(token),
        "error-callback": () => onTokenRef.current(""),
        "expired-callback": () => onTokenRef.current(""),
      });
      return true;
    };

    if (render()) return;
    const timer = window.setInterval(() => {
      if (render()) window.clearInterval(timer);
    }, 300);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}

export const captchaEnabled = Boolean(SITE_KEY);
