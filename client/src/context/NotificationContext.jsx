import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit, writeBatch, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
    notifications: [],
    unreadCount: 0,
    loading: true,
    error: null,
    markAsRead: async () => { },
    markAllAsRead: async () => { }
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (!user?.uid) {
            setNotifications([]);
            setLoading(false);
            setError(null);
            return;
        }


        // Limit to last 100 notifications (increased from 50)
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const notifs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setNotifications(notifs);
                setLoading(false);
                setError(null); // Clear error on success
                setRetryCount(0); // Reset retry count
            },
            (err) => {
                console.error('[NotificationContext] Error subscribing:', err);
                setLoading(false);
                setError(err.message);

                // Auto-retry up to 3 times
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
                    console.log(`[NotificationContext] Retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, delay);
                } else {
                    console.error('[NotificationContext] Max retries reached. Please refresh the page.');
                }
            }
        );

        return () => unsubscribe();
    }, [user, retryCount]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = async (id) => {
        try {
            const docRef = doc(db, 'notifications', id);
            await updateDoc(docRef, { isRead: true });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);

        if (unreadIds.length === 0) return;

        try {
            // Split into chunks of 10 for Firestore batch limit
            const chunks = [];
            for (let i = 0; i < unreadIds.length; i += 10) {
                chunks.push(unreadIds.slice(i, i + 10));
            }

            // Process each chunk with writeBatch
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    const docRef = doc(db, 'notifications', id);
                    batch.update(docRef, { isRead: true });
                });
                await batch.commit();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const clearAll = async () => {
        try {
            const batch = writeBatch(db);
            notifications.forEach((notif) => {
                const docRef = doc(db, 'notifications', notif.id);
                batch.delete(docRef);
            });
            await batch.commit();
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, markAsRead, markAllAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};
