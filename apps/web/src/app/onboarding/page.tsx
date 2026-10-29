import type { Metadata } from 'next';
import { OnboardingScreen } from './onboarding-screen';

export const metadata: Metadata = { title: 'Get started' };

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
