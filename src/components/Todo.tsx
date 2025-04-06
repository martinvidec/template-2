import { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import ShareTodo from './ShareTodo';
import { useAuth } from '@/lib/hooks/useAuth';
import { useError } from '@/lib/hooks/useError';
import Image from 'next/image';

interface UserInfo {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

interface TodoProps {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  sharedWith?: string[];
  isOwner: boolean;
  originalUserId?: string;
}

export default function Todo({ id, text, completed, userId, sharedWith = [], isOwner: isOwnerProp, originalUserId }: TodoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [showShare, setShowShare] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const { user } = useAuth();
  const { reportError } = useError();

  const isOwner = user?.uid === userId;
  const canEdit = isOwner || (sharedWith ?? []).includes(user?.uid || '');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userPromises = [
          // Get owner info
          getDoc(doc(db, 'users', userId)),
          // Get shared users info
          ...(sharedWith ?? []).map(uid => getDoc(doc(db, 'users', uid)))
        ];

        const userDocs = await Promise.all(userPromises);
        const userInfos = userDocs
          .filter(doc => doc.exists())
          .map(doc => ({
            uid: doc.id,
            ...(doc.data() as Omit<UserInfo, 'uid'>),
          }));

        // Sort users: owner first, then shared users
        const owner = userInfos.find(u => u.uid === userId);
        const sharedUsers = userInfos.filter(u => u.uid !== userId);
        setUsers([owner, ...sharedUsers].filter(Boolean) as UserInfo[]);
      } catch (error) {
        console.error('Error fetching user info:', error);
        if (error instanceof Error) {
          reportError(error, { component: 'Todo', operation: 'fetchUsers', todoId: id, ownerId: userId });
        } else {
          reportError(new Error('Unknown error fetching user info'), { component: 'Todo', operation: 'fetchUsers', todoId: id, ownerId: userId });
        }
      }
    };

    fetchUsers();
  }, [userId, sharedWith, reportError, id]);

  const toggleComplete = async () => {
    if (!canEdit) return;
    
    const todoRef = doc(db, `users/${userId}/todos/${id}`);
    try {
      await updateDoc(todoRef, {
        completed: !completed
      });
    } catch (error) {
      console.error('Error toggling complete:', error);
      if (error instanceof Error) {
        reportError(error, { component: 'Todo', operation: 'toggleComplete', todoId: id, ownerId: userId });
      } else {
        reportError(new Error('Unknown error toggling complete'), { component: 'Todo', operation: 'toggleComplete', todoId: id, ownerId: userId });
      }
    }
  };

  const handleEdit = async () => {
    if (!canEdit) return;
    
    if (isEditing) {
      const todoRef = doc(db, `users/${userId}/todos/${id}`);
      try {
        await updateDoc(todoRef, {
          text: editedText
        });
      } catch (error) {
        console.error('Error saving edit:', error);
        if (error instanceof Error) {
          reportError(error, { component: 'Todo', operation: 'handleEditSave', todoId: id, ownerId: userId });
        } else {
          reportError(new Error('Unknown error saving edit'), { component: 'Todo', operation: 'handleEditSave', todoId: id, ownerId: userId });
        }
      }
    }
    setIsEditing(!isEditing);
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    
    const todoRef = doc(db, `users/${userId}/todos/${id}`);
    try {
      await deleteDoc(todoRef);
    } catch (error) {
      console.error('Error deleting todo:', error);
      if (error instanceof Error) {
        reportError(error, { component: 'Todo', operation: 'handleDelete', todoId: id, ownerId: userId });
      } else {
        reportError(new Error('Unknown error deleting todo'), { component: 'Todo', operation: 'handleDelete', todoId: id, ownerId: userId });
      }
    }
  };

  return (
    <div className="flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-2 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={completed}
            onChange={toggleComplete}
            disabled={!canEdit}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:focus:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
          />
          {isEditing ? (
            <input
              type="text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 p-1 border rounded text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 dark:border-gray-600"
              autoFocus
              onBlur={handleEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            />
          ) : (
            <span
              className={`flex-1 text-gray-900 dark:text-gray-100 ${completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}
              onDoubleClick={() => { if (canEdit) setIsEditing(true); }}
            >
              {text}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={handleEdit}
              className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isEditing ? 'Save' : 'Edit'}
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setShowShare(!showShare)}
                className="px-2 py-1 text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              >
                {showShare ? 'Close Share' : 'Share'}
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* User avatars */}
      {users.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Access:</span>
          <div className="flex -space-x-2">
            {users.map((userInfo) => (
              <div
                key={userInfo.uid}
                className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-gray-800"
                title={`${userInfo.displayName || userInfo.email || 'Unknown user'} ${userInfo.uid === userId ? '(Owner)' : ''}`.trim()}
              >
                {userInfo.photoURL ? (
                  <Image
                    src={userInfo.photoURL}
                    alt={userInfo.displayName || 'User avatar'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-gray-200">
                      {userInfo.displayName?.[0] || userInfo.email?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showShare && isOwner && (
        <ShareTodo todoId={id} userId={userId} />
      )}
    </div>
  );
} 