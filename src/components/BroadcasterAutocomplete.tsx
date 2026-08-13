import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

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
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);

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
        setHighlightedIndex(-1); // Reset highlight on input change
    };

    const handleOptionClick = (option: BroadcasterOption) => {
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

    return (
        <div className="relative">
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

export default BroadcasterAutocomplete;
