'use client';

import React from 'react';
import MentionsList from '@/components/MentionsList'; // We will create this next

// TODO: Add Metadata for this page
// export const metadata: Metadata = {
//   title: 'Mentions | Aido',
//   description: 'Todos where you have been mentioned',
// };

export default function MentionsPage() {
  return (
    <main className="flex-1 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          Mentions
        </h1>
        <MentionsList /> 
      </div>
    </main>
  );
} 