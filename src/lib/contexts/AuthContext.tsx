"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    console.log("Starting Google sign in process");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      console.log("Opening Google sign in popup");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful:", result.user.email);
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the popup");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("Sign in was cancelled");
      } else {
        console.error("Unknown error during sign in:", error.message);
      }
    }
  };

  const signOutUser = async () => {
    try {
      console.log("Starting sign out process");
      // Warte kurz, um sicherzustellen, dass alle Firestore-Operationen abgeschlossen sind
      await new Promise(resolve => setTimeout(resolve, 100));
      await firebaseSignOut(auth);
      console.log("Sign out successful");
    } catch (error: any) {
      console.error("Error signing out:", error.message);
      // Versuche trotzdem den User-State zurückzusetzen
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut: signOutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
