// src/components/BroadcasterAutocomplete.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BroadcasterOption {
    value: string;
    label: string;
}

interface BroadcasterAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const BroadcasterAutocomplete = ({ value, onChange, placeholder = 'Seleccione un canal' }: BroadcasterAutocompleteProps) => {
    const [options, setOptions] = useState<BroadcasterOption[]>([]);
    const [inputValue, setInputValue] = useState(value);
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        const fetchBroadcasters = async () => {
            try {
                console.log('Fetching broadcasters from database...');
                const { data, error } = await supabase.rpc('get_distinct_broadcaster');
                console.log('Raw broadcaster data:', data);

                if (error) throw error;

                if (data) {
                    console.log('Raw broadcaster data from database:', data);
                    
                    const broadcasterOptions = data.map((row: any) => {
                        const broadcasterName = row.transmision || 'Sin canal';
                        return {
                            value: broadcasterName,
                            label: broadcasterName
                        };
                    });
                    
                    console.log('Processed broadcaster options:', broadcasterOptions);
                    setOptions(broadcasterOptions);
                } else {
                    console.log('No broadcaster data returned from database');
                }
            } catch (error) {
                console.error('Error fetching broadcasters:', error);
            }
        };

        fetchBroadcasters();
    }, []);

    // Sync inputValue when value prop changes (e.g., when modal opens with selected match)
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
        setShowOptions(true);
    };

    const handleOptionClick = (option: BroadcasterOption) => {
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

export default BroadcasterAutocomplete;
