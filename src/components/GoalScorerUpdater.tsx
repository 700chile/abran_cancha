// src/components/GoalScorerUpdater.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Match {
    id: number;
    eq_local: string;
    eq_visita: string;
}

interface Jugadora {
    ID: number;
    NOMBRE: string;
    APELLIDO: string;
}

interface Competition {
    ID: number;
    NOMBRE: string;
    EDICION: string;
}

const GoalScorerUpdater = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [jugadoras, setJugadoras] = useState<Jugadora[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [selectedJugadora, setSelectedJugadora] = useState<Jugadora | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredPlayers, setFilteredPlayers] = useState<Jugadora[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [minute, setMinute] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<number | null>(2);
    const [selectedEventType, setSelectedEventType] = useState<'GOL' | 'AUTOGOL'>('GOL');

    // Fetch competitions
    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                const { data, error } = await supabase
                    .from('campeonato')
                    .select('ID, NOMBRE, EDICION');

                if (error) throw error;
                setCompetitions(data || []);
            } catch (error) {
                console.error('Error fetching competitions:', error);
                setError('Error fetching competitions');
            }
        };

        fetchCompetitions();
    }, []);

    // Fetch matches based on selected competition
    useEffect(() => {
        const fetchMatches = async () => {
            if (!selectedCompetition) {
                setMatches([]);
                return;
            }

            try {
                const { data: matchesData, error: matchesError } = await supabase
                    .rpc('matches_without_scorers', {
                        torneo: selectedCompetition
                    });

                if (matchesError) throw matchesError;
                
                console.log('Available matches:', matchesData);
                setMatches(matchesData || []);
            } catch (error) {
                console.error('Error fetching matches:', error);
                setError('Error fetching matches');
            }
        };

        fetchMatches();
    }, [selectedCompetition]);

    // Fetch players for selected match
    useEffect(() => {
        const fetchPlayers = async () => {
            if (!selectedMatch) {
                setJugadoras([]);
                setSelectedJugadora(null);
                setSearchQuery('');
                setFilteredPlayers([]);
                return;
            }

            setLoadingPlayers(true);
            setError(null);
            setSearchQuery('');
            setFilteredPlayers([]);

            try {
                // Call RPC function to get players for the match
                const { data: playersData, error: playersError } = await supabase
                    .rpc('get_match_players', {
                        match: selectedMatch.id
                    });

                if (playersError) {
                    console.error('RPC error:', playersError);
                    throw playersError;
                }

                console.log('Players fetched successfully:', playersData);
                
                // Transform the data to match our Jugadora interface and remove duplicates
                const uniquePlayers = new Map();
                (playersData || []).forEach((player: any) => {
                    const playerId = player.id_jugadora || player.id;
                    if (!uniquePlayers.has(playerId)) {
                        uniquePlayers.set(playerId, {
                            ID: playerId,
                            NOMBRE: player.nombre || player.NOMBRE || '',
                            APELLIDO: player.apellido || player.APELLIDO || ''
                        });
                    }
                });
                
                setJugadoras(Array.from(uniquePlayers.values()));
                
            } catch (error: any) {
                console.error('Error fetching players:', error);
                setError('Error al cargar las jugadoras: ' + (error.message || 'Error desconocido'));
            } finally {
                setLoadingPlayers(false);
            }
        };

        fetchPlayers();
    }, [selectedMatch]);

    // Moved handlePlayerSelect to the component scope
    const handlePlayerSelect = (jugadora: Jugadora) => {
        setSelectedJugadora(jugadora);
        setSearchQuery(`${jugadora.NOMBRE || ''} ${jugadora.APELLIDO || ''}`.trim());
        setShowDropdown(false);
        
        // Focus the minute input after selection
        setTimeout(() => {
            const minuteInput = document.querySelector('input[placeholder*="Minuto"]') as HTMLInputElement;
            if (minuteInput) minuteInput.focus();
        }, 100);
    };

    const isValidMinute = (value: string): boolean => {
        // Check if the minute value is valid:
        // 1. Must contain only numbers and +
        // 2. If there's a +, it must be followed by a number
        // 3. Must end with a number
        if (!/^[0-9+]*$/.test(value)) return false;
        
        const parts = value.split('+');
        if (parts.length > 1 && !parts[parts.length - 1]) return false;
        
        return /[0-9]$/.test(value);
    };

    const handleAddGoal = async () => {
        // Reset messages
        setError(null);
        setSuccessMessage(null);
        
        // Validate inputs
        if (!selectedMatch) {
            setError('Por favor selecciona un partido');
            return;
        }
        
        if (!selectedJugadora) {
            setError('Por favor selecciona una jugadora');
            return;
        }
        
        if (!minute || !isValidMinute(minute)) {
            setError('Por favor ingresa un minuto válido (ej: 45, 90+3, 120)');
            return;
        }

        try {
            // Use the player ID directly from the selected player
            const playerId = selectedJugadora.ID;
            if (!playerId) throw new Error('ID de jugadora no válido');

            console.log('Adding goal with:', {
                matchId: selectedMatch.id,
                playerId,
                playerName: `${selectedJugadora.NOMBRE} ${selectedJugadora.APELLIDO}`,
                minute,
                eventType: selectedEventType
            });

            // First check if nomina entry already exists
            const { data: existingNomina, error: checkError } = await supabase
                .from('nomina')
                .select('ID')
                .eq('ID_JUGADORA', playerId)
                .eq('ID_PARTIDO', selectedMatch.id)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking nomina:', checkError);
                throw new Error('Error al verificar la nómina: ' + checkError.message);
            }

            let nominaId;
            if (existingNomina) {
                nominaId = existingNomina.ID;
            } else {
                // Create new nomina entry if it doesn't exist
                const { data: nominaData, error: nominaError } = await supabase
                    .from('nomina')
                    .insert({
                        ID_JUGADORA: playerId,
                        ID_PARTIDO: selectedMatch.id
                    })
                    .select('ID');

                if (nominaError) throw nominaError;
                nominaId = nominaData[0]?.ID;
                if (!nominaId) throw new Error('Failed to get nomina ID');
            }

            // Then insert into eventos
            const { error: eventoError } = await supabase
                .from('eventos')
                .insert({
                    ID_NOMINA: nominaId,
                    EVENTO: selectedEventType,
                    MINUTO: minute
                });

            if (eventoError) throw eventoError;

            // Reset form
            setSelectedMatch(null);
            setSelectedJugadora(null);
            setSearchQuery(''); // Clear the search query
            setFilteredPlayers([]); // Clear filtered players
            setMinute('');
            setSelectedEventType('GOL'); // Reset event type to default
            setError(null);
            setSuccessMessage('¡Gol registrado exitosamente!');
            setTimeout(() => setSuccessMessage(null), 3000);

            // Update top scorers
            const { error: updateError } = await supabase
                .rpc('get_top_scorers', {
                    grupo_id_param: selectedCompetition || 2
                });

            if (updateError) console.error('Error updating top scorers:', updateError);

            // Update top scorers
            const { error: updateTopScorersError } = await supabase
                .rpc('get_top_scorers', {
                    grupo_id_param: selectedCompetition || 2
                });

            if (updateTopScorersError) {
                console.error('Error updating top scorers:', updateTopScorersError);
            }

            // Refetch matches to update the list after goal submission
            try {
                const { data: updatedMatches, error: matchesError } = await supabase
                    .rpc('matches_without_scorers', {
                        torneo: selectedCompetition
                    });

                if (!matchesError && updatedMatches) {
                    setMatches(updatedMatches);
                    // Reset selected match if it was removed from the list
                    if (selectedMatch && !updatedMatches.some((m: Match) => m.id === selectedMatch.id)) {
                        setSelectedMatch(null);
                    }
                }
            } catch (error) {
                console.error('Error refreshing matches:', error);
                // Don't show error to user as the goal was already added successfully
            }
        } catch (error) {
            console.error('Error adding goal:', error);
            setError('Error al registrar el gol. Por favor, inténtalo de nuevo.');
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="w-full px-0 sm:px-2 lg:px-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
                    REGISTRAR GOLES
                </h1>

                <div className="bg-white rounded-lg shadow-md p-4">
                    {successMessage && (
                        <div className="bg-green-50 text-green-500 p-2 rounded mb-4">
                            {successMessage}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-500 p-2 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Competition Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Campeonato
                            </label>
                            <select
                                value={selectedCompetition || ''}
                                onChange={(e) => setSelectedCompetition(Number(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                                required
                            >
                                <option value="">Seleccione un campeonato</option>
                                {competitions.map((comp) => (
                                    <option key={comp.ID} value={comp.ID}>
                                        {comp.NOMBRE} {comp.EDICION}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Match Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partido
                            </label>
                            <select
                                value={selectedMatch?.id || ''}
                                onChange={(e) => {
                                    const match = matches.find(m => m.id === parseInt(e.target.value)) || null;
                                    setSelectedMatch(match);
                                }}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">Selecciona un partido</option>
                                {matches.map((match) => (
                                    <option key={`match-${match.id}`} value={match.id}>
                                        {match.eq_local} vs {match.eq_visita}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Jugadora Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Jugadora
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    ref={inputRef}
                                    value={selectedJugadora ? `${selectedJugadora.NOMBRE} ${selectedJugadora.APELLIDO}` : searchQuery}
                                    onChange={(e) => {
                                        const query = e.target.value.trim();
                                        setSearchQuery(query);
                                        setSelectedJugadora(null);
                                        
                                        if (query.length > 0) {
                                            // Normalize search query and split into terms
                                            const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
                                            
                                            // Filter players based on search terms
                                            const filtered = jugadoras.filter(jugadora => {
                                                if (!jugadora.ID) return false;
                                                
                                                const fullName = `${jugadora.NOMBRE || ''} ${jugadora.APELLIDO || ''}`.toLowerCase().trim();
                                                const nombre = (jugadora.NOMBRE || '').toLowerCase();
                                                const apellido = (jugadora.APELLIDO || '').toLowerCase();
                                                
                                                // Match all search terms
                                                return searchTerms.every(term => 
                                                    nombre.includes(term) || 
                                                    apellido.includes(term) ||
                                                    fullName.includes(term)
                                                );
                                            });
                                            
                                            setFilteredPlayers(filtered);
                                            setShowDropdown(true);
                                        } else {
                                            setFilteredPlayers([]);
                                            setShowDropdown(false);
                                        }
                                    }}
                                    onFocus={() => {
                                        if (jugadoras.length > 0 && !selectedJugadora) {
                                            setFilteredPlayers(jugadoras);
                                            setShowDropdown(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        // Small delay to allow click events to fire before hiding dropdown
                                        setTimeout(() => setShowDropdown(false), 200);
                                    }}
                                    className="w-full p-2 border rounded"
                                    placeholder={loadingPlayers ? 'Cargando jugadoras...' : 'Buscar jugadora...'}
                                    disabled={!selectedMatch || loadingPlayers}
                                />
                                
                                {loadingPlayers && (
                                    <div className="absolute inset-0 flex items-center justify-end pr-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                    </div>
                                )}
                                
                                {showDropdown && filteredPlayers.length > 0 && (
                                    <div 
                                        className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200"
                                    >
                                        {filteredPlayers.map((jugadora) => (
                                            <div
                                                key={`player-${jugadora.ID}`}
                                                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                onMouseDown={(e) => {
                                                    // Use onMouseDown instead of onClick to prevent input blur before selection
                                                    e.preventDefault();
                                                    handlePlayerSelect(jugadora);
                                                }}
                                            >
                                                <div className="font-medium">
                                                    {jugadora.NOMBRE} {jugadora.APELLIDO}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {showDropdown && filteredPlayers.length === 0 && searchQuery && (
                                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg p-2 text-gray-500">
                                        No se encontraron jugadoras que coincidan con "{searchQuery}"
                                    </div>
                                )}
                            </div>
                            
                            {/* Debug helper - only in development */}
                            {process.env.NODE_ENV === 'development' && (
                                <div style={{ display: 'none' }}>
                                    <button onClick={() => console.log('Selected jugadora:', selectedJugadora)}>
                                        Debug: Log Selected Player
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Event Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Evento
                            </label>
                            <select
                                value={selectedEventType}
                                onChange={(e) => setSelectedEventType(e.target.value as 'GOL' | 'AUTOGOL')}
                                className="w-full p-2 border rounded"
                                disabled={!selectedMatch || !selectedJugadora}
                            >
                                <option value="GOL">Gol</option>
                                <option value="AUTOGOL">Autogol</option>
                            </select>
                        </div>

                        {/* Minute Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Minuto
                            </label>
                            <input
                                type="text"
                                value={minute}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow only numbers and + sign during input
                                    if (/^[0-9+]*$/.test(value)) {
                                        setMinute(value);
                                    }
                                }}
                                className="w-full p-2 border rounded"
                                placeholder="Ej: 45, 90+3, 120"
                                disabled={!selectedMatch || !selectedJugadora}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleAddGoal}
                            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                            disabled={!selectedMatch || !selectedJugadora || !minute || !isValidMinute(minute)}
                        >
                            REGISTRAR GOL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalScorerUpdater;
