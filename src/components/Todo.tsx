import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface TodoProps {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
}

export default function Todo({ id, text, completed, userId }: TodoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);

  const toggleComplete = async () => {
    const todoRef = doc(db, `users/${userId}/todos/${id}`);
    await updateDoc(todoRef, {
      completed: !completed
    });
  };

  const handleEdit = async () => {
    if (isEditing) {
      const todoRef = doc(db, `users/${userId}/todos/${id}`);
      await updateDoc(todoRef, {
        text: editedText
      });
    }
    setIsEditing(!isEditing);
  };

  const handleDelete = async () => {
    const todoRef = doc(db, `users/${userId}/todos/${id}`);
    await deleteDoc(todoRef);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow mb-2 border border-gray-200">
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={completed}
          onChange={toggleComplete}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        {isEditing ? (
          <input
            type="text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="flex-1 p-1 border rounded text-gray-900"
            autoFocus
          />
        ) : (
          <span className={`flex-1 text-gray-900 ${completed ? 'line-through text-gray-500' : ''}`}>
            {text}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleEdit}
          className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
} 