import { useAuth } from '@/lib/hooks/useAuth';

export default function UserProfile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  console.log('User photo URL:', user.photoURL); // Debugging

  // Funktion zum Extrahieren der Initialen
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Prüfe, ob ein gültiges Profilbild vorhanden ist
  const hasValidPhoto = user.photoURL && user.photoURL.startsWith('https://');

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        {hasValidPhoto ? (
          <div className="w-8 h-8">
            <img
              src={user.photoURL}
              alt={user.displayName || 'User avatar'}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(user.displayName)}
          </div>
        )}
        <span className="text-gray-900 text-sm font-medium">
          {user.displayName || user.email}
        </span>
      </div>
      <button
        onClick={signOut}
        className="text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
      >
        Sign Out
      </button>
    </div>
  );
} 