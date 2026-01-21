import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

export default function CreatableSelect({ value, onChange, options = [], placeholder = "Selecione ou crie..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef(null);

    useEffect(() => {
        // Sync internal search term if value changes externally (edit mode)
        if (value) setSearchTerm(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                // If closed without selecting, revert to value or keep partial?
                // Better UX: if strict, revert. If creatable, maybe keep?
                // Let's keep it simple: just close.
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (val) => {
        setSearchTerm(val);
        onChange({ target: { value: val } }); // Mimic event object for compatibility
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative' }} ref={wrapperRef}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white',
                    paddingRight: '8px'
                }}
            >
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        // Also trigger onChange for instant creation typing?
                        // Or wait for selection? 
                        // Let's trigger it so it acts like a normal input too
                        onChange(e);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        padding: '0.75rem',
                        background: 'transparent',
                        borderRadius: '8px',
                        fontSize: '1rem'
                    }}
                />
                <ChevronDown size={16} color="#94a3b8" />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 50,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    {filteredOptions.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            {opt}
                        </div>
                    ))}

                    {/* Create Option */}
                    {!filteredOptions.includes(searchTerm) && searchTerm.trim() !== "" && (
                        <div
                            onClick={() => handleSelect(searchTerm)}
                            style={{ padding: '0.75rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            <Plus size={16} /> Criar "{searchTerm}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
