import { Metadata } from 'next';
import UserSettings from '@/components/UserSettings';

export const metadata: Metadata = {
  title: 'Settings | Aido',
  description: 'Manage your account settings and preferences',
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <UserSettings />
    </main>
  );
} 