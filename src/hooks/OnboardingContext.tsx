import React, { createContext, useContext, useMemo, useState } from 'react';

type OnboardingState = {
  aiConsent: boolean;
  setAiConsent: (v: boolean) => void;
  templateId: string;
  setTemplateId: (id: string) => void;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [aiConsent, setAiConsent] = useState(false);
  const [templateId, setTemplateId] = useState('balanced');
  const value = useMemo(
    () => ({ aiConsent, setAiConsent, templateId, setTemplateId }),
    [aiConsent, templateId],
  );
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
