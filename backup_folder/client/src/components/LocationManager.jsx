import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Save, Trash2, Edit2, X, Navigation, Sparkles, Building2 } from 'lucide-react';
import api from '../services/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './Toast';
import { cn } from '../lib/utils';

const LocationManager = () => {
    const [locations, setLocations] = useState([]);
    const [newLocationName, setNewLocationName] = useState('');
    const [editingLocation, setEditingLocation] = useState({ id: '', name: '' });
    const { showSuccess, showError } = useToast();

    const fetchLocations = async () => {
        try {
            const res = await api.get('/locations');
            setLocations(res.data);
        } catch (error) {
            console.error("Error fetching locations", error);
            showError('Failed to load locations');
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const handleAddLocation = async (e) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;
        try {
            await api.post('/locations', { name: newLocationName });
            setNewLocationName('');
            fetchLocations();
            showSuccess('Location added successfully');
        } catch (error) {
            showError(error.response?.data?.message || 'Error adding location');
        }
    };

    const handleUpdateLocation = async (id) => {
        if (!editingLocation.name.trim() || editingLocation.name === locations.find(l => l.id === id)?.name) {
            setEditingLocation({ id: '', name: '' });
            return;
        }
        try {
            await api.put(`/locations/${id}`, { name: editingLocation.name });
            setEditingLocation({ id: '', name: '' });
            fetchLocations();
            showSuccess('Location updated successfully');
        } catch (error) {
            showError(error.response?.data?.message || 'Error updating location');
        }
    };

    const handleDeleteLocation = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/locations/${id}`);
            fetchLocations();
            showSuccess('Location deleted successfully');
        } catch (error) {
            showError('Error deleting location');
        }
    };

    // Color palette for location items
    const colors = ['emerald', 'cyan', 'blue', 'violet', 'fuchsia', 'orange'];
    const colorMap = {
        emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', iconBg: 'bg-emerald-500' },
        cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', iconBg: 'bg-cyan-500' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-600', iconBg: 'bg-blue-500' },
        violet: { bg: 'bg-violet-100', text: 'text-violet-600', iconBg: 'bg-violet-500' },
        fuchsia: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', iconBg: 'bg-fuchsia-500' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-600', iconBg: 'bg-orange-500' },
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Page Header - Neubrutalism Style */}
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <MapPin size={28} strokeWidth={2.5} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                        Location Management
                        <Navigation size={18} className="text-emerald-500" />
                    </h1>
                    <p className="text-sm font-bold text-slate-500">Configure venue locations and available spaces</p>
                </div>
                <div className="ml-auto hidden md:flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-emerald-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-sm font-black text-emerald-600">{locations.length}</span>
                        <span className="text-xs font-bold text-slate-500 ml-1">Locations</span>
                    </div>
                </div>
            </div>

            {/* Add New Location Section - Neubrutalism Style */}
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="px-6 py-4 border-b-2 border-dashed border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Plus size={18} strokeWidth={2.5} className="text-cyan-600" />
                    </div>
                    <h2 className="text-lg font-black text-black">Add New Location</h2>
                </div>
                <div className="p-6">
                    <form onSubmit={handleAddLocation} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-sm font-bold text-black">Location Name</label>
                            <Input
                                value={newLocationName}
                                onChange={(e) => setNewLocationName(e.target.value)}
                                placeholder="e.g. Room 104, Beta Hall"
                                className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all font-medium"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Add Location
                        </Button>
                    </form>
                </div>
            </div>

            {/* List Locations - Neubrutalism Style */}
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="px-6 py-4 border-b-2 border-dashed border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Building2 size={18} strokeWidth={2.5} className="text-violet-600" />
                        </div>
                        <h2 className="text-lg font-black text-black">All Locations</h2>
                    </div>
                    <span className="px-2 py-1 bg-slate-100 rounded-md border border-black text-xs font-bold text-slate-600">
                        {locations.length} total
                    </span>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {locations.map((location, index) => {
                            const colorKey = colors[index % colors.length];
                            const theme = colorMap[colorKey];

                            return (
                                <div
                                    key={location.id}
                                    className="flex items-center justify-between bg-white p-3 rounded-lg border-2 border-slate-200 group hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all duration-150 cursor-pointer"
                                >
                                    {editingLocation.id === location.id ? (
                                        <div className="flex gap-2 items-center w-full">
                                            <Input
                                                value={editingLocation.name}
                                                onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                                                className="h-9 text-sm border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleUpdateLocation(location.id)}
                                                className="h-9 w-9 flex items-center justify-center bg-emerald-100 text-emerald-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all shrink-0"
                                            >
                                                <Save size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => setEditingLocation({ id: '', name: '' })}
                                                className="h-9 w-9 flex items-center justify-center bg-slate-100 text-slate-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all shrink-0"
                                            >
                                                <X size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-9 h-9 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center", theme.iconBg)}>
                                                    <MapPin size={16} strokeWidth={2.5} className="text-white" />
                                                </div>
                                                <span className="text-black font-bold">{location.name}</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingLocation({ id: location.id, name: location.name })}
                                                    className="h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                >
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLocation(location.id, location.name)}
                                                    className="h-8 w-8 flex items-center justify-center bg-rose-100 text-rose-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                                                >
                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {locations.length === 0 && (
                        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                            <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <MapPin size={32} strokeWidth={2} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-black text-black mb-1">No locations yet</h3>
                            <p className="text-sm font-bold text-slate-500">Add your first location using the form above</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationManager;
