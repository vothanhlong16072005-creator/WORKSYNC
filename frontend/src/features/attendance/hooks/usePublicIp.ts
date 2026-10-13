import { useState, useEffect } from 'react';

/**
 * Hook to retrieve client public IP from public lookup service with timeout fallback.
 */
export function usePublicIp(): string | undefined {
  const [publicIp, setPublicIp] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    fetch('https://api.ipify.org?format=json', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ip?: string } | null) => {
        if (active && data?.ip) {
          setPublicIp(data.ip);
        }
      })
      .catch(() => {
        // Silently ignore if offline or blocked by adblock
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  return publicIp;
}
