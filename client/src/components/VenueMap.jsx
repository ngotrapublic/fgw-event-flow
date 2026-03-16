import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Info, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

const VenueMap = ({ onSelect, selectedLocation, bookedLocations = [] }) => {
    const [hoveredLocation, setHoveredLocation] = useState(null);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const hasMoved = useRef(false);
    const svgRef = useRef(null);

    // Venue Data Definition (Matched with API)
    const venues = [
        { id: 'Sảnh Tầng 2', name: 'Sảnh Tầng 2', path: 'M50,350 L250,350 L250,550 L50,550 Z', x: 150, y: 450, capacity: '100 pax', type: 'Lobby', area: '200m²' },
        { id: 'Sảnh B', name: 'Sảnh B', path: 'M300,350 L500,350 L500,550 L300,550 Z', x: 400, y: 450, capacity: '100 pax', type: 'Lobby', area: '200m²' },
        { id: 'Hội trường Alpha', name: 'Hội trường Alpha', path: 'M50,50 L500,50 L500,300 L50,300 Z', x: 275, y: 175, capacity: '500 pax', type: 'Hall', area: '1125m²' },
        { id: 'Phòng 101', name: 'Phòng 101', path: 'M550,50 L750,50 L750,200 L550,200 Z', x: 650, y: 125, capacity: '50 pax', type: 'Meeting Room', area: '150m²' },
        { id: 'Phòng 102', name: 'Phòng 102', path: 'M550,250 L750,250 L750,400 L550,400 Z', x: 650, y: 325, capacity: '50 pax', type: 'Meeting Room', area: '150m²' },
        { id: 'Sân Stadium', name: 'Sân Stadium', path: 'M550,450 L750,450 L750,550 L550,550 Z', x: 650, y: 500, capacity: '200 pax', type: 'Outdoor', area: '200m²' },
    ];

    // Zoom Handlers
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // Pan Handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        hasMoved.current = false;
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            hasMoved.current = true;
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = (e) => {
        setIsDragging(false);

        // Handle Click (if not dragged)
        if (!hasMoved.current) {
            // Find if we clicked on a venue group
            const venueGroup = e.target.closest('g[data-venue-id]');
            if (venueGroup) {
                const venueId = venueGroup.getAttribute('data-venue-id');
                const venue = venues.find(v => v.id === venueId);
                if (venue && !bookedLocations.includes(venue.id)) {
                    onSelect(venue.name);
                }
            }
        }
    };

    const handleWheel = (e) => {
        e.preventDefault(); // Prevent page scroll
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3));
    };

    // Attach wheel listener to SVG ref to prevent passive event issues
    useEffect(() => {
        const el = svgRef.current;
        if (el) {
            el.addEventListener('wheel', handleWheel, { passive: false });
            return () => el.removeEventListener('wheel', handleWheel);
        }
    }, []);

    return (
        <div className="relative w-full h-full bg-[#f0f4f8] rounded-xl overflow-hidden border border-slate-200 shadow-inner group select-none">

            {/* Architectural Grid Background */}
            <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            ></div>

            {/* Map Container */}
            <div
                className="w-full h-full cursor-move active:cursor-grabbing flex items-center justify-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDragging(false)}
            >
                <div
                    ref={svgRef}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        transformOrigin: 'center center'
                    }}
                >
                    <svg width="800" height="600" viewBox="0 0 800 600" className="drop-shadow-2xl">
                        {/* Floor Base */}
                        <rect x="20" y="20" width="760" height="560" rx="20" fill="white" stroke="#cbd5e1" strokeWidth="4" />

                        {/* Corridors / Structure */}
                        <path d="M275,300 L275,350 L500,350" fill="none" stroke="#e2e8f0" strokeWidth="40" strokeLinecap="round" />

                        {/* Venue Areas */}
                        {venues.map((venue) => {
                            const isSelected = selectedLocation === venue.id || selectedLocation === venue.name;
                            const isBooked = bookedLocations.includes(venue.id);
                            const isHovered = hoveredLocation?.id === venue.id;

                            let fill = '#f8fafc';
                            let stroke = '#64748b';
                            let strokeWidth = 2;

                            if (isBooked) {
                                fill = 'url(#diagonal-stripe-red)';
                                stroke = '#ef4444';
                            } else if (isSelected) {
                                fill = '#3b82f6';
                                stroke = '#1d4ed8';
                                strokeWidth = 0;
                            } else if (isHovered) {
                                fill = '#e0f2fe';
                                stroke = '#0ea5e9';
                                strokeWidth = 3;
                            } else {
                                fill = 'white';
                            }

                            return (
                                <g
                                    key={venue.id}
                                    data-venue-id={venue.id}
                                    onMouseEnter={() => setHoveredLocation(venue)}
                                    onMouseLeave={() => setHoveredLocation(null)}
                                    className={`transition-all duration-300 ${isBooked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {/* Shadow for depth */}
                                    <path d={venue.path} fill="black" fillOpacity="0.1" transform="translate(4,4)" />

                                    {/* Main Shape */}
                                    <path
                                        d={venue.path}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={strokeWidth}
                                        className="transition-all duration-300 ease-out"
                                    />

                                    {/* Label */}
                                    <text
                                        x={venue.x}
                                        y={venue.y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className={`text-xs font-bold pointer-events-none transition-colors duration-300 uppercase tracking-wider ${isSelected ? 'fill-white' : 'fill-slate-600'}`}
                                        style={{ fontSize: '12px', fontFamily: 'monospace' }}
                                    >
                                        {venue.id}
                                    </text>

                                    {/* Area (Architectural Detail) */}
                                    {!isSelected && !isHovered && (
                                        <text
                                            x={venue.x}
                                            y={venue.y + 15}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="text-[8px] fill-slate-400 pointer-events-none font-mono"
                                        >
                                            {venue.area}
                                        </text>
                                    )}

                                    {/* Status Icon */}
                                    {isBooked && (
                                        <text x={venue.x} y={venue.y - 20} textAnchor="middle" className="fill-red-500 text-lg">🔒</text>
                                    )}
                                    {isSelected && !isBooked && (
                                        <text x={venue.x} y={venue.y - 25} textAnchor="middle" className="fill-white text-lg animate-bounce">📍</text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Patterns */}
                        <defs>
                            <pattern id="diagonal-stripe-red" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                <rect width="5" height="10" transform="translate(0,0)" fill="#fee2e2" />
                            </pattern>
                        </defs>
                    </svg>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white p-2 rounded-xl shadow-xl border border-slate-100">
                <button onClick={handleZoomIn} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors" title="Zoom In">
                    <ZoomIn size={20} />
                </button>
                <button onClick={handleZoomOut} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors" title="Zoom Out">
                    <ZoomOut size={20} />
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button onClick={handleReset} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors" title="Reset View">
                    <Maximize size={20} />
                </button>
            </div>

            {/* Hover Tooltip (Rich) */}
            {hoveredLocation && (
                <div
                    className="absolute pointer-events-none bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-100 z-20 transition-all duration-200 max-w-xs"
                    style={{
                        left: '20px',
                        top: '20px'
                    }}
                >
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${bookedLocations.includes(hoveredLocation.id) ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-base">{hoveredLocation.name}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide text-slate-500">{hoveredLocation.type}</span>
                                <span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide text-slate-500">{hoveredLocation.capacity}</span>
                                <span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide text-slate-500">{hoveredLocation.area}</span>
                            </div>

                            {/* Amenities Mockup */}
                            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Wifi 6
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Projector
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> AC
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Sound
                                </div>
                            </div>

                            {bookedLocations.includes(hoveredLocation.id) && (
                                <div className="mt-3 text-xs text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                                    <Info size={14} /> Currently Booked
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-28 left-6 bg-white/95 backdrop-blur p-3 rounded-lg shadow-md border border-blue-200 text-[10px] space-y-2 z-10">
                <h4 className="font-bold text-slate-700 mb-0.5">Chú thích</h4>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-white border border-slate-400 shadow-sm"></div>
                    <span className="text-slate-600">Trống (Available)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500 border border-blue-600 shadow-sm"></div>
                    <span className="text-slate-600">Đang chọn (Selected)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[url(#diagonal-stripe-red)] border border-red-500 shadow-sm"></div>
                    <span className="text-slate-600">Đã đặt (Booked)</span>
                </div>
            </div>
        </div>
    );
};

export default VenueMap;
