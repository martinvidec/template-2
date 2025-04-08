'use client';

// Remove useEffect and useRouter imports if not needed elsewhere
// import { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import TodoList from '@/components/TodoList';
// import { useRouter } from 'next/navigation';

export default function Home() {
  // Auth state is now handled by ProtectedLayout
  // const { user, loading } = useAuth(); 
  // const router = useRouter();

  // Remove the redirection useEffect
  /*
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  */

  // Remove the loading/redirect check, ProtectedLayout handles this
  /*
  if (loading || !user) {
    return (
      <div className="min-h-screen flex ...">Loading...</div>
    );
  }
  */

  // This component now assumes user is authenticated because of ProtectedLayout
  return (
    <main className="flex-1 p-4">
      <div className="max-w-4xl mx-auto">
        <TodoList />
      </div>
    </main>
  );
} 