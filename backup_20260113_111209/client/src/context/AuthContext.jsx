import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext({
    user: null,
    loading: true,
    isAdmin: false,
    isManager: false,
    login: async () => { },
    logout: async () => { }
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[Auth] Listening for auth state changes...');
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log('[Auth] User detected:', firebaseUser.email);
                try {
                    // Fetch user role from Firestore
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        console.log('[Auth] Role fetched:', userData.role);
                        setUser({
                            ...firebaseUser,
                            role: userData.role || 'user',
                            name: userData.name || firebaseUser.email,
                            department: userData.department || ''
                        });
                    } else {
                        // Default to 'user' role if no document found
                        console.warn('[Auth] No user document found in Firestore, defaulting to "user"');
                        setUser({
                            ...firebaseUser,
                            role: 'user'
                        });
                    }
                } catch (error) {
                    console.error('[Auth] Error fetching user role:', error);
                    // Fallback in case of error
                    setUser({ ...firebaseUser, role: 'user' });
                }
            } else {
                console.log('[Auth] No user signed in');
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        return signOut(auth);
    };

    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';

    const value = {
        user,
        loading,
        isAdmin,
        isManager,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
