import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from '@/i18n/i18n';

// Auto-cleanup DOM after each test (unmount React trees)
afterEach(() => {
  cleanup();
});

// Mock react-i18next to avoid needing real i18n init in tests.
// We use the real i18n instance bundled with the app so component-translation
// roundtrips work in tests (e.g. t('dashboard.pm.completion_rate') resolves to VI/EN text).
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    // Provide a stand-in useTranslation that respects a per-test language override
    useTranslation: () => ({
      i18n,
      t: (key: string, opts?: any, maybeOpts?: any) => {
        const defaultValue =
          typeof opts === 'string'
            ? opts
            : typeof maybeOpts === 'string'
              ? maybeOpts
              : (opts?.defaultValue as string | undefined);

        if (key.includes('.')) {
          // Resolve nested key from current language bundle (e.g. "dashboard.pm.x")
          const parts = key.split('.');
          let cur: any = (i18n.getResourceBundle(i18n.language || 'vi', 'translation') || {});
          for (const p of parts) cur = cur?.[p];
          if (typeof cur === 'string') {
            const interpolationOpts = typeof opts === 'object' ? opts : maybeOpts;
            if (interpolationOpts) {
              // Simple interpolation
              return cur.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) =>
                interpolationOpts[k] !== undefined ? String(interpolationOpts[k]) : `{{${k}}}`,
              );
            }
            return cur;
          }
        }
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        return key;
      },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty' as const, init: () => {} },
  };
});

// Mock leaflet globally for tests (avoids "window is not defined" etc.)
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn(),
      remove: vi.fn(),
      invalidateSize: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      fitBounds: vi.fn(),
      flyTo: vi.fn(),
      eachLayer: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    circle: vi.fn(() => ({ addTo: vi.fn(), bindTooltip: vi.fn() })),
    marker: vi.fn(() => ({
      addTo: vi.fn(),
      bindPopup: vi.fn(),
      setLatLng: vi.fn(),
      setIcon: vi.fn(),
    })),
    polyline: vi.fn(() => ({ addTo: vi.fn(), setLatLngs: vi.fn() })),
    divIcon: vi.fn(),
    latLngBounds: vi.fn(),
    control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
    Icon: { Default: { mergeOptions: vi.fn() } },
  },
}));
