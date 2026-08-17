import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

interface VenueOption {
    value: string;
    label: string;
}

interface VenueAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const VenueAutocomplete = ({ value, onChange, placeholder = 'Seleccione un recinto' }: VenueAutocompleteProps) => {
    const [options, setOptions] = useState<VenueOption[]>([]);
    const [inputValue, setInputValue] = useState(value);
    const [showOptions, setShowOptions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchVenues = async () => {
            try {
                console.log('Fetching venues from database...');
                const { data, error } = await supabase.rpc('get_distinct_venues');
                console.log('Raw venue data:', data);

                if (error) throw error;

                if (data) {
                    console.log('Raw venue data from database:', data);
                    
                    const venueOptions = data.map((row: any) => {
                        const venueName = row.recinto || 'Sin recinto';
                        return {
                            value: venueName,
                            label: venueName
                        };
                    });
                    
                    console.log('Processed venue options:', venueOptions);
                    setOptions(venueOptions);
                } else {
                    console.log('No venue data returned from database');
                }
            } catch (error) {
                console.error('Error fetching venues:', error);
            }
        };

        fetchVenues();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
        setShowOptions(true);
        setHighlightedIndex(-1); // Reset highlight on input change
    };

    const handleOptionClick = (option: VenueOption) => {
        setInputValue(option.value);
        onChange(option.value);
        setShowOptions(false);
        setHighlightedIndex(-1);
    };

    const filteredOptions = options.filter(option => 
        option && option.label && option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showOptions || filteredOptions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (e.key === 'Escape') {
            setShowOptions(false);
            setHighlightedIndex(-1);
        }
    };

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const optionElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (optionElement) {
                optionElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {showOptions && filteredOptions.length > 0 && (
                <div 
                    ref={listRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto"
                >
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option.value}
                            className={`p-2 cursor-pointer break-words ${
                                index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                            }`}
                            onClick={() => handleOptionClick(option)}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VenueAutocomplete;
