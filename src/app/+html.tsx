import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// The web page around the app (web output is "server", which uses this file instead of public/index.html).
// Head: notch-aware viewport, installable-app tags, the RN-web reset, and the pre-load ember.
// The #boot overlay shows while the app's code downloads; the root layout removes it once React is running.

const STYLES = `
  html,
  body {
    height: 100%;
    background-color: #0b0b0d;
  }
  body {
    overflow: hidden;
    /* feel like an app, not a web page: no long-press callouts, text selection or tap flashes */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior: none;
  }
  input,
  textarea {
    -webkit-user-select: text;
    user-select: text;
    /* 16px+ stops iOS Safari zooming into inputs */
    font-size: 16px;
  }
  #root {
    display: flex;
    height: 100%;
    flex: 1;
  }

  /* Pre-load ember: plain HTML/CSS so it shows while the app's code downloads.
     The root layout removes it once React runs; the in-app EmberLoader looks identical, so the hand-off is seamless. */
  .boot {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: #0b0b0d;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 36px;
    padding-bottom: 12vh;
    font-family: ui-rounded, -apple-system, system-ui, sans-serif;
  }
  .boot-glow {
    position: absolute;
    width: 340px;
    height: 340px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 107, 44, 0.22), rgba(255, 107, 44, 0) 70%);
    animation: boot-breathe 2.4s ease-in-out infinite;
    margin-top: -12vh;
  }
  .boot-ember {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 45%, #fff6d5 0%, #ffc15e 28%, #ff6b2c 62%, #9a2a08 100%);
    box-shadow: 0 0 24px 6px rgba(255, 107, 44, 0.55), 0 0 70px 18px rgba(255, 80, 20, 0.25);
    animation: boot-flicker 1.7s ease-in-out infinite;
  }
  .boot-spark {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ffd27a;
    box-shadow: 0 0 6px 2px rgba(255, 160, 60, 0.8);
    opacity: 0;
    animation: boot-rise 2.2s ease-out infinite;
  }
  .boot-spark:nth-child(2) { animation-delay: 0.6s; --dx: -18px; }
  .boot-spark:nth-child(3) { animation-delay: 1.2s; --dx: 14px; }
  .boot-spark:nth-child(4) { animation-delay: 1.7s; --dx: -6px; }
  .boot-text {
    position: relative;
    height: 20px;
    width: 260px;
    color: #9a9aa3;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-align: center;
  }
  .boot-text span {
    position: absolute;
    inset: 0;
    opacity: 0;
    animation: boot-cycle 5.6s infinite;
  }
  .boot-text span:nth-child(2) { animation-delay: 1.4s; }
  .boot-text span:nth-child(3) { animation-delay: 2.8s; }
  .boot-text span:nth-child(4) { animation-delay: 4.2s; }
  @keyframes boot-flicker {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    30% { transform: scale(1.06); filter: brightness(1.15); }
    55% { transform: scale(0.97); filter: brightness(0.92); }
    75% { transform: scale(1.04); filter: brightness(1.08); }
  }
  @keyframes boot-breathe {
    0%, 100% { transform: scale(0.9); opacity: 0.7; }
    50% { transform: scale(1.08); opacity: 1; }
  }
  @keyframes boot-rise {
    0% { transform: translate(-50%, -50%); opacity: 0; }
    15% { opacity: 1; }
    100% { transform: translate(calc(-50% + var(--dx, 8px)), -90px); opacity: 0; }
  }
  @keyframes boot-cycle {
    0% { opacity: 0; transform: translateY(4px); }
    5%, 22% { opacity: 1; transform: none; }
    27%, 100% { opacity: 0; transform: translateY(-4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .boot * { animation-duration: 0.01s !important; animation-iteration-count: 1 !important; }
    .boot-text span:first-child { opacity: 1; }
  }
`;

const BOOT = `
  <div id="boot" class="boot" aria-label="Loading Ember">
    <div class="boot-glow"></div>
    <div class="boot-ember"><i class="boot-spark"></i><i class="boot-spark"></i><i class="boot-spark"></i><i class="boot-spark"></i></div>
    <div class="boot-text">
      <span>Lighting the ember…</span><span>Feeding it oxygen…</span><span>Fanning the flames…</span><span>Stoking the coals…</span>
    </div>
  </div>
`;

// After a deploy the old code files are gone. A home-screen app can still open an old cached copy of this page, whose
// scripts then 404 and leave it stuck on the boot screen. When one of the app's files fails to load, fetch the page
// fresh once (a new ?v= skips the cache); sessionStorage stops it from looping if the server itself is down.
const RECOVER = `
  (function () {
    var url = new URL(location.href);
    if (url.searchParams.has('v')) {
      url.searchParams.delete('v');
      history.replaceState(null, '', url);
    }
    addEventListener('error', function (e) {
      var src = e.target && (e.target.src || e.target.href);
      if (!src || src.indexOf('/_expo/') < 0) return;
      try {
        if (sessionStorage.getItem('ember-recovered')) return;
        sessionStorage.setItem('ember-recovered', '1');
      } catch (_) {}
      url.searchParams.set('v', Date.now());
      location.replace(url);
    }, true);
    addEventListener('load', function () {
      setTimeout(function () { try { sessionStorage.removeItem('ember-recovered'); } catch (_) {} }, 10000);
    });
  })();
`;

export default function Root({ children }: PropsWithChildren) {
  // Expo's own tags: stylesheets and preloads for <head>, the app's scripts for <body>. Leaving these out drops the app.
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover lets the app draw under the notch; safe-area insets keep content clear of it */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>Ember</title>

        {/* Installable web app ("Add to Home Screen") */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0B0D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ember" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <script dangerouslySetInnerHTML={{ __html: RECOVER }} />
        <ScrollViewStyleReset />
        <style id="ember-reset" dangerouslySetInnerHTML={{ __html: STYLES }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        <div dangerouslySetInnerHTML={{ __html: BOOT }} />
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
