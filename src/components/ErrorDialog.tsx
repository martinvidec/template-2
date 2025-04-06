"use client";

import React, { useState } from 'react';

interface ErrorDialogProps {
  error: Error;
  contextInfo?: Record<string, any> | string;
  onClose: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ error, contextInfo, onClose }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatContextInfo = () => {
    if (!contextInfo) return 'N/A';
    if (typeof contextInfo === 'string') return contextInfo;
    try {
      return JSON.stringify(contextInfo, null, 2);
    } catch (e) {
      return 'Could not stringify context info.';
    }
  };

  const technicalDetails = `
Error Message: ${error.message}
Context: ${formatContextInfo()}
Stack Trace:
${error.stack || 'N/A'}
  `;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(technicalDetails)
      .then(() => alert('Debug info copied to clipboard!')) // Simple feedback
      .catch(err => console.error('Failed to copy debug info:', err));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">Ein Fehler ist aufgetreten</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Entschuldigung, es ist ein unerwartetes Problem aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support, falls das Problem weiterhin besteht.
        </p>

        <details className="mb-4" open={isDetailsOpen} onToggle={(e) => setIsDetailsOpen(e.currentTarget.open)}>
          <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Technische Details anzeigen
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
            {technicalDetails.trim()}
          </pre>
          <button
            onClick={copyToClipboard}
            className="mt-2 text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={!navigator.clipboard} // Disable if clipboard API not available
          >
            Details kopieren
          </button>
        </details>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
        >
          Schließen
        </button>
      </div>
    </div>
  );
};

export default ErrorDialog; 