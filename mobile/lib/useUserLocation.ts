import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

const LOC_KEY = 'stamply.user.location';
const DENIED_KEY = 'stamply.location.denied_at';
const REMIND_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Safe import — returns null if module not in binary
let ExpoLocation: any = null;
if (Platform.OS !== 'web') {
  try { ExpoLocation = require('expo-location'); } catch {}
}

export type LocationState = {
  loc: { lat: number; lng: number } | null;
  status: 'unknown' | 'granted' | 'denied' | 'requesting';
  requestPermission: () => Promise<void>;
  shouldPrompt: boolean;
};

export function useUserLocation(): LocationState {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOC_KEY);
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'requesting'>('unknown');
  const [shouldPrompt, setShouldPrompt] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (loc) {
        setStatus('granted');
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLoc(newLoc);
            localStorage.setItem(LOC_KEY, JSON.stringify(newLoc));
          },
          () => {},
          { timeout: 5000 },
        );
      } else {
        const deniedAt = typeof localStorage !== 'undefined' ? localStorage.getItem(DENIED_KEY) : null;
        if (!deniedAt || Date.now() - Number(deniedAt) > REMIND_INTERVAL) {
          setShouldPrompt(true);
        }
        setStatus('unknown');
      }
    } else if (ExpoLocation) {
      // Native with expo-location available
      (async () => {
        try {
          const { status: ps } = await ExpoLocation.getForegroundPermissionsAsync();
          if (ps === 'granted') {
            setStatus('granted');
            const p = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
            setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
          } else {
            setStatus('unknown');
            setShouldPrompt(true);
          }
        } catch {
          setStatus('unknown');
          setShouldPrompt(true);
        }
      })();
    } else {
      // Native without expo-location — show prompt but can't request
      setStatus('unknown');
      setShouldPrompt(true);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setStatus('requesting');

    if (Platform.OS === 'web') {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(newLoc);
        setStatus('granted');
        setShouldPrompt(false);
        localStorage.setItem(LOC_KEY, JSON.stringify(newLoc));
        localStorage.removeItem(DENIED_KEY);
      } catch {
        setStatus('denied');
        setShouldPrompt(false);
        localStorage.setItem(DENIED_KEY, String(Date.now()));
      }
    } else if (ExpoLocation) {
      try {
        const { status: ps } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (ps === 'granted') {
          setStatus('granted');
          setShouldPrompt(false);
          const p = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        } else {
          setStatus('denied');
          setShouldPrompt(false);
        }
      } catch {
        setStatus('denied');
        setShouldPrompt(false);
      }
    } else {
      setStatus('denied');
      setShouldPrompt(false);
    }
  }, []);

  return { loc, status, requestPermission, shouldPrompt };
}
