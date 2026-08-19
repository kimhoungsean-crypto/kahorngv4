importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

const CACHE_NAME = "kahorng-v1";

self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
    // No caching.
});

/* ============================================================
   Push notifications (Firebase Cloud Messaging)
   ============================================================ */

firebase.initializeApp({
  apiKey: "AIzaSyDhlY4ddtVCfe60qI0rf7Mk53bNUoAljoo",
  authDomain: "kahorngpush.firebaseapp.com",
  projectId: "kahorngpush",
  storageBucket: "kahorngpush.firebasestorage.app",
  messagingSenderId: "332993684474",
  appId: "1:332993684474:web:fe004d1658983b5565fa43"
});

const messaging = firebase.messaging();

const ICON_URL = "https://i.ibb.co/MyFQSJGQ/kahorng-icon-512-1.png";

// Fires when a push arrives while no Kahorng tab/window is focused. Builds
// the notification ourselves (rather than relying on FCM's implicit
// display of a `notification` payload) so we can attach `data` for
// notificationclick to read below.
//
// The outgoing message is data-only (see buildFcmRequests' own comment,
// NotificationService.gs) — title/body travel inside `data`, not a
// top-level `notification` field. A message that carried one would get
// auto-displayed by the browser itself, in addition to this handler
// manually calling showNotification() below, producing two identical
// banners for one push. Reading them from `data` instead is what makes
// this the ONLY thing that ever displays anything for a backgrounded push.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'Kahorng', {
    body: data.body || '',
    icon: ICON_URL,
    badge: ICON_URL,
    data: data
  });
});

// A tap on the notification: focus an already-open Kahorng window and
// hand it the destination view (+ entityId, if present — Notification
// Pass 3 deep-linking), or open a fresh one at that view's hash if none
// is open. Two delivery paths for the view on purpose — a postMessage to
// an existing client, and a URL hash on a freshly opened one — since a
// brand-new window's top-level script may not have its message listener
// attached in time to catch a postMessage sent the instant it opens.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const view = (event.notification.data && event.notification.data.view) || '';
  // FCM data payloads are string-only server-side (see buildFcmRequests'
  // note in NotificationService.gs) — a combined multi-bill notification
  // deliberately omits entityId entirely rather than sending it as the
  // literal string "null", but this still defends against any stray/old
  // value shaped like one.
  let entityId = (event.notification.data && event.notification.data.entityId) || '';
  if (!entityId || entityId === 'null' || entityId === 'undefined') entityId = '';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.indexOf(self.registration.scope) === 0);
      if (existing) {
        existing.focus();
        existing.postMessage({ source: 'kahorng-sw', type: 'navigate', view: view, entityId: entityId || null });
        return;
      }
      const hash = view ? (view + (entityId ? ('?e=' + encodeURIComponent(entityId)) : '')) : '';
      return self.clients.openWindow(hash ? ('./#' + hash) : './');
    })
  );
});
