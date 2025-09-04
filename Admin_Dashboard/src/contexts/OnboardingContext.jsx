import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(
    localStorage.getItem('onboarding_complete') === 'true'
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    localStorage.setItem('onboarding_complete', 'true');
  };

  const startTour = () => {
    setShowTour(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const endTour = () => {
    setShowTour(false);
    setCurrentStep(0);
  };

  const resetOnboarding = () => {
    setIsOnboardingComplete(false);
    localStorage.removeItem('onboarding_complete');
    setCurrentStep(0);
    setShowTour(false);
  };

  const value = {
    isOnboardingComplete,
    currentStep,
    showTour,
    completeOnboarding,
    startTour,
    nextStep,
    prevStep,
    endTour,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
