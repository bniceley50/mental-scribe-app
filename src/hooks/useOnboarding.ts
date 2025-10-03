import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  isActive: boolean;
  totalSteps: number;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  startOnboarding: () => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      currentStep: 0,
      isActive: false,
      totalSteps: 7,
      
      completeOnboarding: () => set({ 
        hasCompletedOnboarding: true, 
        isActive: false,
        currentStep: 0 
      }),
      
      resetOnboarding: () => set({ 
        hasCompletedOnboarding: false, 
        currentStep: 0,
        isActive: true 
      }),
      
      nextStep: () => set((state) => {
        const nextStep = state.currentStep + 1;
        if (nextStep >= state.totalSteps) {
          return { 
            currentStep: 0, 
            isActive: false, 
            hasCompletedOnboarding: true 
          };
        }
        return { currentStep: nextStep };
      }),
      
      previousStep: () => set((state) => ({
        currentStep: Math.max(0, state.currentStep - 1)
      })),
      
      skipOnboarding: () => set({
        hasCompletedOnboarding: true,
        isActive: false,
        currentStep: 0
      }),
      
      startOnboarding: () => set({
        isActive: true,
        currentStep: 0,
        hasCompletedOnboarding: false
      }),
    }),
    {
      name: 'clinical-ai-onboarding',
    }
  )
);
