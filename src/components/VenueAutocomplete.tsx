// src/components/VenueAutocomplete.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
    };

    const handleOptionClick = (option: VenueOption) => {
        setInputValue(option.value);
        onChange(option.value);
        setShowOptions(false);
    };

    const filteredOptions = options.filter(option => 
        option && option.label && option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className="relative">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {showOptions && filteredOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.map((option) => (
                        <div
                            key={option.value}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
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
