import { useState, useEffect } from 'react';
import { notificationsApi } from '../api/notifications.api';
import { useAuthStore } from '@/stores/auth.store';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useAuthStore();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register service worker if not registered
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    }
  }, [user?.id]);

  const subscribe = async () => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey =
        import.meta.env.VITE_VAPID_PUBLIC_KEY ||
        'BJAo2v-WU99QH-W-KksXUQctq-x576Fh3cxBegR2Tdf0_GPklGTVMQz6fbgmprxhatUk4sBASdv90h_hgKaDbhE';

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        await notificationsApi.subscribePush({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent: navigator.userAgent,
        });
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to subscribe to Web Push:', err);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await notificationsApi.unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from Web Push:', err);
      setLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}
