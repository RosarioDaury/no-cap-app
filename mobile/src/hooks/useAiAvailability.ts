import { useEffect, useMemo } from 'react';
import { useAuth } from '@/src/hooks/AuthProvider';
import { useDb } from '@/src/hooks/DbProvider';
import { useOnline } from '@/src/hooks/useOnline';

export type AiGateReason = 'ok' | 'consent' | 'offline' | 'signedOut';

export type AiAvailability = {
  /** Settings / onboarding opt-in. */
  consent: boolean;
  /** Device reports an active network path. */
  online: boolean;
  /** JWT session present on this device. */
  signedIn: boolean;
  /** Consent + online + signed in — chat feature may be used. */
  available: boolean;
  /** Why chat is blocked, or `ok` when available. */
  reason: AiGateReason;
};

/**
 * Conversational AI requires explicit consent, a signed-in account, and internet.
 * Local cap insights do not use this gate.
 */
export function useAiAvailability(): AiAvailability {
  const { settings } = useDb();
  const { user } = useAuth();
  const consent = !!settings?.aiConsent;
  const signedIn = !!user;
  const online = useOnline();

  return useMemo(() => {
    if (!consent) {
      return { consent, online, signedIn, available: false, reason: 'consent' as const };
    }
    if (!online) {
      return { consent, online, signedIn, available: false, reason: 'offline' as const };
    }
    if (!signedIn) {
      return { consent, online, signedIn, available: false, reason: 'signedOut' as const };
    }
    return { consent, online, signedIn, available: true, reason: 'ok' as const };
  }, [consent, online, signedIn]);
}
