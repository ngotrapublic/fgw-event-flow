import React from 'react';
import { X, Map } from 'lucide-react';
import VenueMap from './VenueMap';

const VenueMapModal = ({ isOpen, onClose, onSelect, selectedLocation, bookedLocations }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                            <Map size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Select Venue Location</h3>
                            <p className="text-sm text-slate-500">Click on an available area to select it</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Map Area */}
                <div className="flex-1 overflow-hidden bg-slate-50 p-4 relative">
                    <VenueMap
                        onSelect={(loc) => {
                            onSelect(loc);
                            onClose();
                        }}
                        selectedLocation={selectedLocation}
                        bookedLocations={bookedLocations}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center text-xs text-slate-400">
                    <span>Use mouse to hover and explore areas.</span>
                    <div className="flex gap-4">
                        <span>• Main Hall: 500 pax</span>
                        <span>• Meeting Rooms: 50 pax</span>
                        <span>• Outdoor: 200 pax</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VenueMapModal;
