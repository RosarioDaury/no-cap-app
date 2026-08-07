import { useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDb } from '@/src/hooks/DbProvider';

export type AiGateReason = 'ok' | 'consent' | 'offline';

export type AiAvailability = {
  /** Settings / onboarding opt-in. */
  consent: boolean;
  /** Device reports an active network path. */
  online: boolean;
  /** Consent + online — chat feature may be used. */
  available: boolean;
  /** Why chat is blocked, or `ok` when available. */
  reason: AiGateReason;
};

/**
 * Conversational AI requires explicit consent and internet.
 * Local cap insights do not use this gate.
 */
export function useAiAvailability(): AiAvailability {
  const { settings } = useDb();
  const consent = !!settings?.aiConsent;
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable;
      // Treat null reachable as online when connected (common on first tick).
      setOnline(connected && reachable !== false);
    });
    return unsub;
  }, []);

  return useMemo(() => {
    if (!consent) {
      return { consent, online, available: false, reason: 'consent' as const };
    }
    if (!online) {
      return { consent, online, available: false, reason: 'offline' as const };
    }
    return { consent, online, available: true, reason: 'ok' as const };
  }, [consent, online]);
}
