'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import TodoList from '@/components/TodoList';

export default function Home() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {user ? (
        <>
          <main className="flex-1 p-4">
            <div className="max-w-4xl mx-auto">
              <TodoList />
            </div>
          </main>
        </>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Todo App</h1>
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}
