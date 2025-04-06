"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { User } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      if (user) {
        try {
          // Check if user document exists
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // Create user document if it doesn't exist
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: new Date(),
              theme: 'system',
              notifications: {
                email: true,
                push: true,
              },
              language: 'en',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
          }

          // Set up real-time listener for user document
          unsubscribeRef.current = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              console.log("User document updated");
            }
          });
        } catch (error) {
          console.error("Error creating/updating user document:", error);
        }
      } else {
        // Clean up Firestore listener when user signs out
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      }
      setUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
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
      // Clean up Firestore listener before signing out
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setUser(null);
      await firebaseSignOut(auth);
      console.log("Sign out successful");
    } catch (error: any) {
      console.error("Error signing out:", error.message);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
