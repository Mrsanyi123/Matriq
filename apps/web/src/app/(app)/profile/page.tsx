import type { Metadata } from 'next';
import { ProfileScreen } from './profile-screen';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage() {
  return <ProfileScreen />;
}
