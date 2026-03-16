import { useState, useEffect } from 'react';
import { eventsApi } from '../api/events';
import { useToast } from '../components/Toast';

export const useEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { showToast } = useToast();

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await eventsApi.getAll();
            setEvents(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            showToast('Failed to load events', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const createEvent = async (eventData) => {
        try {
            const newEvent = await eventsApi.create(eventData);
            setEvents([...events, newEvent]);
            showToast('Event created successfully', 'success');
            return newEvent;
        } catch (err) {
            showToast('Failed to create event', 'error');
            throw err;
        }
    };

    const updateEvent = async (id, eventData) => {
        try {
            const updated = await eventsApi.update(id, eventData);
            setEvents(events.map(e => e.id === id ? updated : e));
            showToast('Event updated successfully', 'success');
            return updated;
        } catch (err) {
            showToast('Failed to update event', 'error');
            throw err;
        }
    };

    const deleteEvent = async (id) => {
        try {
            await eventsApi.delete(id);
            setEvents(events.filter(e => e.id !== id));
            showToast('Event deleted successfully', 'success');
        } catch (err) {
            showToast('Failed to delete event', 'error');
            throw err;
        }
    };

    const checkConflict = async (eventData) => {
        try {
            const result = await eventsApi.checkConflict(eventData);
            return result;
        } catch (err) {
            showToast('Failed to check conflict', 'error');
            throw err;
        }
    };

    return {
        events,
        loading,
        error,
        createEvent,
        updateEvent,
        deleteEvent,
        checkConflict,
        refreshEvents: fetchEvents
    };
};
