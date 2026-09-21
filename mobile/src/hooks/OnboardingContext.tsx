import React, { createContext, useContext, useMemo, useState } from 'react';

type OnboardingState = {
  displayName: string;
  setDisplayName: (v: string) => void;
  aiConsent: boolean;
  setAiConsent: (v: boolean) => void;
  templateId: string;
  setTemplateId: (id: string) => void;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayName] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const [templateId, setTemplateId] = useState('balanced');
  const value = useMemo(
    () => ({
      displayName,
      setDisplayName,
      aiConsent,
      setAiConsent,
      templateId,
      setTemplateId,
    }),
    [displayName, aiConsent, templateId],
  );
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
