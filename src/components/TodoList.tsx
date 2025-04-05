import { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import Todo from './Todo';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) {
      console.log("No user logged in");
      return;
    }

    console.log("Setting up todos listener for user:", user.uid);
    const q = query(
      collection(db, `users/${user.uid}/todos`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log("Todos updated");
        const todosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TodoItem[];
        setTodos(todosData);
      },
      (error) => {
        console.error("Error fetching todos:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) {
      console.log("Cannot add todo: no text or no user");
      return;
    }

    try {
      console.log("Adding new todo");
      await addDoc(collection(db, `users/${user.uid}/todos`), {
        text: newTodo,
        completed: false,
        createdAt: new Date(),
      });
      console.log("Todo added successfully");
      setNewTodo('');
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4 text-gray-900">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-4 text-gray-900">
        Please sign in to manage your todos
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={addTodo} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {todos.map((todo) => (
          <Todo
            key={todo.id}
            id={todo.id}
            text={todo.text}
            completed={todo.completed}
            userId={user.uid}
          />
        ))}
      </div>
    </div>
  );
} 