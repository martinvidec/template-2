import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  limit,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// --- User Profile Functions --- 

export const saveUserProfile = async (userId: string, data: { email?: string | null; displayName?: string | null; photoURL?: string | null }) => {
  const userRef = doc(db, 'users', userId);
  const profileData = {
    ...data,
    displayNameLower: data.displayName ? data.displayName.toLowerCase() : null,
  };
  await setDoc(userRef, profileData, { merge: true });
};

export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? docSnap.data() : null;
};

// --- Contact Management Functions --- 

export const sendContactRequest = async (targetEmail: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated.");
  if (currentUser.email === targetEmail) throw new Error("You cannot send a contact request to yourself.");

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', targetEmail), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) throw new Error(`User with email ${targetEmail} not found.`);

  const targetUserDoc = querySnapshot.docs[0];
  const targetUid = targetUserDoc.id;
  const targetUserData = targetUserDoc.data();
  const currentUid = currentUser.uid;

  // --- Corrected Document References (Simpler Structure) ---
  // Path: users/{currentUid}/contacts/{targetUid}
  const contactRef = doc(db, 'users', currentUid, 'contacts', targetUid);
  
  // Path: users/{currentUid}/outgoingContactRequests/{targetUid}
  const outgoingRequestRef = doc(db, 'users', currentUid, 'outgoingContactRequests', targetUid);
  
  // Path: users/{currentUid}/incomingContactRequests/{targetUid} (Request FROM target TO current)
  const incomingRequestRef = doc(db, 'users', currentUid, 'incomingContactRequests', targetUid);

  // Path: users/{targetUid}/contacts/{currentUid}
  const targetContactRef = doc(db, 'users', targetUid, 'contacts', currentUid);
  
  // Path: users/{targetUid}/incomingContactRequests/{currentUid} (Request FROM current TO target)
  const targetIncomingRequestRef = doc(db, 'users', targetUid, 'incomingContactRequests', currentUid);

  // --- Check existing states --- 
  const contactSnap = await getDoc(contactRef);
  if (contactSnap.exists()) throw new Error(`You are already contacts with ${targetEmail}.`);

  const outgoingRequestSnap = await getDoc(outgoingRequestRef);
  if (outgoingRequestSnap.exists()) throw new Error(`Contact request to ${targetEmail} already sent.`);

  // Check if target has already sent a request to current user
  const requestFromTargetToCurrentUserRef = doc(db, 'users', currentUid, 'incomingContactRequests', targetUid);
  const requestFromTargetToCurrentUserSnap = await getDoc(requestFromTargetToCurrentUserRef);

  if (requestFromTargetToCurrentUserSnap.exists()) {
    const batch = writeBatch(db);
    batch.set(contactRef, {
      uid: targetUid,
      email: targetUserData.email || targetEmail,
      displayName: targetUserData.displayName || null,
      photoURL: targetUserData.photoURL || null,
      addedAt: serverTimestamp(),
    });
    batch.set(targetContactRef, {
      uid: currentUid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      addedAt: serverTimestamp(),
    });
    
    batch.delete(requestFromTargetToCurrentUserRef); // Delete incoming request for current user
    // Delete the corresponding outgoing request from the target user
    const correspondingOutgoingRequestFromTargetRef = doc(db, 'users', targetUid, 'outgoingContactRequests', currentUid);
    batch.delete(correspondingOutgoingRequestFromTargetRef);

    await batch.commit();
    console.log(`Successfully added ${targetEmail} as a contact (accepted incoming request).`);
    return;
  }

  // --- If none of the above, send a new request --- 
  const batch = writeBatch(db);
  const requestData = { requestedAt: serverTimestamp(), status: 'pending' };
  const incomingData = {
    ...requestData,
    requesterEmail: currentUser.email,
    requesterDisplayName: currentUser.displayName,
    requesterPhotoURL: currentUser.photoURL,
  };

  batch.set(outgoingRequestRef, requestData); // users/{currentUid}/outgoingContactRequests/{targetUid}
  batch.set(targetIncomingRequestRef, incomingData); // users/{targetUid}/incomingContactRequests/{currentUid}
  
  await batch.commit();
  console.log(`Contact request successfully sent to ${targetEmail}.`);
};

// --- Interface for Outgoing Request Data --- 
export interface OutgoingRequest {
  id: string; // targetUserId
  status: string;
  requestedAt: Date;
  targetUser?: { // Details des Benutzers, an den die Anfrage ging
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  };
}

// --- Function to get outgoing contact requests --- 
export const getOutgoingContactRequests = async (userId: string): Promise<OutgoingRequest[]> => {
  if (!userId) return [];

  try {
    const requestsColRef = collection(db, 'users', userId, 'outgoingContactRequests');
    // Optional: Order by requestedAt descending
    const q = query(requestsColRef, orderBy('requestedAt', 'desc')); 
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const requestsPromises = snapshot.docs.map(async (reqDoc) => {
      const reqData = reqDoc.data();
      const targetUserId = reqDoc.id; // The ID of the document is the target user's UID

      // Fetch target user's profile
      let targetUserProfile: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null = null;
      try {
        const userProfile = await getUserProfile(targetUserId);
        if (userProfile) {
          targetUserProfile = {
            displayName: userProfile.displayName,
            email: userProfile.email,
            photoURL: userProfile.photoURL,
          };
        }
      } catch (profileError) {
        console.error(`Error fetching profile for target user ${targetUserId}:`, profileError);
        // Continue without profile info if it fails
      }
      
      return {
        id: targetUserId,
        status: reqData.status || 'pending',
        // Ensure requestedAt is converted to Date if it's a Firestore Timestamp
        requestedAt: reqData.requestedAt?.toDate ? reqData.requestedAt.toDate() : new Date(), 
        targetUser: targetUserProfile || undefined, // Use undefined if null to match interface
      } as OutgoingRequest;
    });

    return Promise.all(requestsPromises);

  } catch (error) {
    console.error("Error fetching outgoing contact requests:", error);
    // Depending on how you want to handle errors, you might throw or return empty
    throw error; // Or return [] and let the UI handle it
  }
};

// --- Interface for Incoming Request Data --- 
export interface IncomingRequest {
  id: string; // requesterId
  status: string;
  requestedAt: Date;
  requesterDisplayName?: string | null;
  requesterEmail?: string | null;
  requesterPhotoURL?: string | null;
}

// --- Function to get incoming contact requests --- 
export const getIncomingContactRequests = async (userId: string): Promise<IncomingRequest[]> => {
  if (!userId) return [];
  try {
    const requestsColRef = collection(db, 'users', userId, 'incomingContactRequests');
    const q = query(requestsColRef, orderBy('requestedAt', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, // requesterId
        status: data.status || 'pending',
        requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : new Date(),
        requesterDisplayName: data.requesterDisplayName || null,
        requesterEmail: data.requesterEmail || null,
        requesterPhotoURL: data.requesterPhotoURL || null,
      } as IncomingRequest;
    });
  } catch (error) {
    console.error("Error fetching incoming contact requests:", error);
    throw error;
  }
};

// --- Function to accept a contact request ---
export const acceptContactRequest = async (
  currentUserId: string, 
  requesterId: string, 
  // Pass requester's data to store in current user's contact list
  requesterData: { email?: string | null; displayName?: string | null; photoURL?: string | null } = {}
) => {
  if (!currentUserId || !requesterId) throw new Error("Missing user IDs.");

  const currentUser = auth.currentUser; // For current user's details
  if (!currentUser || currentUser.uid !== currentUserId) {
    throw new Error("User mismatch or not authenticated for accepting request.");
  }

  const batch = writeBatch(db);

  // 1. Add requester to current user's contacts
  const currentUserContactRef = doc(db, 'users', currentUserId, 'contacts', requesterId);
  batch.set(currentUserContactRef, {
    uid: requesterId,
    email: requesterData.email || null,
    displayName: requesterData.displayName || null,
    photoURL: requesterData.photoURL || null,
    addedAt: serverTimestamp(),
  });

  // 2. Add current user to requester's contacts
  // (Fetch current user's profile data for this)
  let currentUserProfileData = { 
      email: currentUser.email, 
      displayName: currentUser.displayName, 
      photoURL: currentUser.photoURL 
  };
  // Optionally, re-fetch profile to ensure it's up-to-date, or rely on auth object
  // const profile = await getUserProfile(currentUserId);
  // if (profile) currentUserProfileData = { email: profile.email, displayName: profile.displayName, photoURL: profile.photoURL };

  const requesterContactRef = doc(db, 'users', requesterId, 'contacts', currentUserId);
  batch.set(requesterContactRef, {
    uid: currentUserId,
    email: currentUserProfileData.email,
    displayName: currentUserProfileData.displayName,
    photoURL: currentUserProfileData.photoURL,
    addedAt: serverTimestamp(),
  });

  // 3. Delete incoming request for current user
  const incomingRequestRef = doc(db, 'users', currentUserId, 'incomingContactRequests', requesterId);
  batch.delete(incomingRequestRef);

  // 4. Delete outgoing request for the requester
  const outgoingRequestRef = doc(db, 'users', requesterId, 'outgoingContactRequests', currentUserId);
  batch.delete(outgoingRequestRef);

  await batch.commit();
  console.log(`Contact request from ${requesterId} accepted by ${currentUserId}.`);
};

// --- Function to reject a contact request ---
export const rejectContactRequest = async (currentUserId: string, requesterId: string) => {
  if (!currentUserId || !requesterId) throw new Error("Missing user IDs for rejection.");

  const batch = writeBatch(db);

  // 1. Delete incoming request for current user
  const incomingRequestRef = doc(db, 'users', currentUserId, 'incomingContactRequests', requesterId);
  batch.delete(incomingRequestRef);

  // 2. Optional: Update status of or delete outgoing request for the requester
  // For simplicity, we can just delete it. Or update its status to 'rejected'.
  const outgoingRequestRef = doc(db, 'users', requesterId, 'outgoingContactRequests', currentUserId);
  // Option A: Delete it
  batch.delete(outgoingRequestRef);
  // Option B: Update status (if you want the sender to see it was rejected)
  // batch.update(outgoingRequestRef, { status: 'rejected', updatedAt: serverTimestamp() });

  await batch.commit();
  console.log(`Contact request from ${requesterId} rejected by ${currentUserId}.`);
};

// --- Interface for Contact Data --- 
export interface Contact {
  uid: string; // UID of the contact
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  addedAt: Date; // When the contact was added
}

// --- Function to get user's contacts --- 
export const getContacts = async (userId: string): Promise<Contact[]> => {
  if (!userId) return [];
  try {
    const contactsColRef = collection(db, 'users', userId, 'contacts');
    // Order by displayName for a sorted list, or by addedAt
    const q = query(contactsColRef, orderBy('displayName', 'asc')); 
    // const q = query(contactsColRef, orderBy('addedAt', 'desc')); 
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id, // The document ID is the contact's UID
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        addedAt: data.addedAt?.toDate ? data.addedAt.toDate() : new Date(),
      } as Contact;
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw error;
  }
};

// --- Add other potential functions like getIncomingContactRequests, getContacts etc. later ---
