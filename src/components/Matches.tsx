// src/components/Matches.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getTeamLogo } from '../utils/teamLogos';

interface Competition {
    ID: number;
    NOMBRE: string;
    EDICION: number;
}

interface Scorer {
    id: number;
    evento: string;
    minutos: string[];
    jug: string;
    team: string;
}

interface Match {
    ID_CAMPEONATO: number;
    NOMBRE_GRUPO: string;
    ID: number;
    id?: number; // Add id as an optional property
    FECHA: string;
    EQUIPO_LOCAL: string;
    goles_local: number | null;
    goles_visita: number | null;
    EQUIPO_VISITA: string;
    PROGRAMACION: string | null;
    RECINTO: string | null;
    programacion?: string | null;
    recinto?: string | null;
    scorers?: Scorer[];
    equipo_local?: string;
    equipo_visita?: string;
    nombre_grupo?: string;
    id_partido?: number;
    penalties?: { home: number; away: number };
}

interface Matchday {
    fecha: string;
}

const Matches: React.FC = () => {
    // State management
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
    const [selectedMatchday, setSelectedMatchday] = useState<string | null>(null);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [matchdays, setMatchdays] = useState<Matchday[]>([]);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
    const [loadingScorers, setLoadingScorers] = useState<boolean>(false);

    // Group matches by group name
    const groupedMatches = useMemo(() => {
        return matches.reduce<Record<string, Match[]>>((acc, match) => {
            const groupName = match.NOMBRE_GRUPO || 'Otros';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(match);
            return acc;
        }, {});
    }, [matches]);


    // Main function to fetch scorers for a match
    const fetchScorers = useCallback(async (matchId: number | undefined): Promise<void> => {
        console.log('fetchScorers called with matchId:', matchId);
        
        if (!matchId) {
            console.error('Error: matchId is undefined in fetchScorers');
            return;
        }

        try {
            setLoadingScorers(true);
            
            // Call the RPC function with the matchId
            const { data, error } = await supabase.rpc('get_scorers_by_match', {
                id_partido: matchId
            });

            if (error) {
                console.error('Error fetching scorers:', error);
                throw error;
            }

            console.log('Scorers data received:', data);
            
            // Update the matches state with the scorers for this match
            setMatches(prevMatches => {
                console.log('Previous matches in setMatches:', prevMatches);
                return prevMatches.map(match => 
                    (match.id === matchId || match.ID === matchId) 
                        ? { 
                            ...match, 
                            scorers: data || [] 
                          } 
                        : match
                );
            });
        } catch (error) {
            console.error('Error in fetchScorers:', error);
        } finally {
            setLoadingScorers(false);
        }
    }, []); // Removed matches from dependencies since we use the functional update form

    // Handle match click to show/hide details
    const handleMatchClick = useCallback((matchId: number) => {
        console.log('handleMatchClick called with matchId:', matchId);
        console.log('Current matches array:', matches);
        
        setSelectedMatchId(prevId => {
            console.log('Previous selected match ID:', prevId);
            console.log('New matchId:', matchId);
            
            // If clicking the same match, close it
            if (prevId === matchId) {
                console.log('Closing match details for matchId:', matchId);
                return null;
            }
            
            // If opening a new match, fetch scorers if needed
            const match = matches.find(m => (m.ID || m.id) === matchId);
            console.log('Found match:', match);
            
            if (match) {
                console.log('Match scorers already loaded:', !!match.scorers);
                if (!match.scorers) {
                    console.log('Fetching scorers for matchId:', matchId);
                    fetchScorers(matchId);
                }
            } else {
                console.error('No match found with ID:', matchId);
            }
            
            return matchId;
        });
    }, [fetchScorers, matches, selectedMatchId]);

    // Fetch competitions on mount
    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                const { data, error } = await supabase
                    .from('campeonato')
                    .select('*')
                    .order('ID', { ascending: false });

                if (error) throw error;
                setCompetitions(data || []);
                
                // Set default competition to ID 2 if it exists, otherwise use the first one
                if (data && data.length > 0) {
                    const defaultComp = data.find(c => c.ID === 2) || data[0];
                    setSelectedCompetition(defaultComp.ID);
                }
            } catch (error) {
                console.error('Error fetching competitions:', error);
            }
        };

        fetchCompetitions();
    }, []);

    // Fetch matchdays when competition changes
    useEffect(() => {
        const fetchMatchdays = async () => {
            if (!selectedCompetition) return;
            
            try {
                // Get all matchdays
                const { data: matchdaysData, error: matchdaysError } = await supabase
                    .rpc('get_distinct_fecha_by_grupo', { param_torneo: selectedCompetition });

                if (matchdaysError) throw matchdaysError;
                setMatchdays(matchdaysData || []);
                
                // Get the max fecha with results
                const { data: maxFechaData, error: maxFechaError } = await supabase
                    .rpc('get_max_fecha_by_grupo', { torneo: selectedCompetition });

                if (maxFechaError) throw maxFechaError;
                
                // Set the default selected matchday to the max fecha with results, or the first available date
                if (matchdaysData && matchdaysData.length > 0) {
                    const defaultDate = maxFechaData || matchdaysData[0].fecha;
                    setSelectedMatchday(defaultDate);
                }
            } catch (error) {
                console.error('Error fetching matchdays:', error);
            }
        };

        fetchMatchdays();
    }, [selectedCompetition]);

    // Fetch matches when matchday changes
    useEffect(() => {
        const fetchMatches = async () => {
            if (!selectedMatchday || !selectedCompetition) return;
            
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .rpc('get_games_by_gameday', { 
                        fecha_param: selectedMatchday, 
                        torneo_param: selectedCompetition 
                    });

                if (error) throw error;

                // Map the data to include proper types and ensure all required fields are present
                const mappedData: Match[] = (data || []).map((match: any) => {
                    // Map database fields to our interface fields
                    return {
                        ...match,
                        ID: match.id_partido || match.ID,
                        EQUIPO_LOCAL: match.equipo_local || match.EQUIPO_LOCAL || 'SIN ASIGNAR',
                        EQUIPO_VISITA: match.equipo_visita || match.EQUIPO_VISITA || 'SIN ASIGNAR',
                        NOMBRE_GRUPO: match.nombre_grupo || match.NOMBRE_GRUPO || 'Sin Grupo',
                        RECINTO: match.recinto || match.RECINTO || null,
                        PROGRAMACION: match.programacion || match.PROGRAMACION || null,
                        goles_local: match.goles_local !== null ? Number(match.goles_local) : null,
                        goles_visita: match.goles_visita !== null ? Number(match.goles_visita) : null,
                    };
                });

                setMatches(mappedData);

                // After setting matches, fetch penalties summary for each match
                try {
                    const summaries = await Promise.all(
                        mappedData.map(async (m) => {
                            const matchId = m.ID || m.id;
                            if (!matchId) return { id: m.ID, penalties: undefined } as { id: number; penalties?: { home: number; away: number } };
                            const { data: pensData, error: pensError } = await supabase.rpc('get_penalties', { match: matchId });
                            if (pensError || !pensData || pensData.length === 0) {
                                return { id: matchId, penalties: undefined } as { id: number; penalties?: { home: number; away: number } };
                            }

                            // Count only converted penalties per team name
                            const homeTeam = (m.EQUIPO_LOCAL || m.equipo_local || '').toString().toLowerCase();
                            const awayTeam = (m.EQUIPO_VISITA || m.equipo_visita || '').toString().toLowerCase();
                            let home = 0;
                            let away = 0;
                            for (const row of pensData as any[]) {
                                if (row.resultado) {
                                    const teamName = (row.nombre || row.NOMBRE || '').toString().toLowerCase();
                                    if (teamName === homeTeam) home++;
                                    else if (teamName === awayTeam) away++;
                                }
                            }
                            if (home === 0 && away === 0) return { id: matchId, penalties: undefined };
                            return { id: matchId, penalties: { home, away } };
                        })
                    );

                    // Merge summaries into matches
                    setMatches(prev => prev.map(pm => {
                        const id = pm.ID || pm.id;
                        const sum = summaries.find(s => s.id === id);
                        return sum && sum.penalties ? { ...pm, penalties: sum.penalties } : pm;
                    }));
                } catch (penErr) {
                    console.error('Error fetching penalties summaries:', penErr);
                }
            } catch (error) {
                console.error('Error fetching matches:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, [selectedMatchday, selectedCompetition]);

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="w-full px-0 sm:px-2 lg:px-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
                    PARTIDOS
                </h1>
                
                {/* Competition and matchday selectors */}
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                    <div className="flex-1">
                        <label htmlFor="competition" className="text-xs font-semibold text-gray-600 uppercase">CAMPEONATO</label>
                        <select 
                            value={selectedCompetition || ''}
                            onChange={(e) => setSelectedCompetition(Number(e.target.value) || null)}
                            className="w-full p-2 border rounded-lg bg-white text-black"
                            disabled={competitions.length === 0}
                        >
                            <option value="">Selecciona un campeonato</option>
                            {competitions.map((competition) => (
                                <option key={competition.ID} value={competition.ID}>
                                    {competition.NOMBRE} {competition.EDICION}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="matchday" className="text-xs font-semibold text-gray-600 uppercase">FECHA</label>
                        <select 
                            value={selectedMatchday || ''}
                            onChange={(e) => setSelectedMatchday(e.target.value || null)}
                            className="w-full p-2 border rounded-lg bg-white text-black"
                            disabled={matchdays.length === 0}
                        >
                            <option value="">Selecciona una fecha</option>
                            {matchdays.map((matchday) => (
                                <option key={matchday.fecha} value={matchday.fecha}>
                                    {matchday.fecha}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
                        <p className="mt-2 text-gray-600">Cargando partidos...</p>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No hay partidos programados para esta fecha.
                    </div>
                ) : (
                    <div>
                        {Object.entries(groupedMatches).map(([groupName, groupMatches]) => (
                            <div key={groupName} className="mb-8">
                                <h2 className="text-xl font-bold mb-4 text-brand-primary">{groupName}</h2>
                                <div className="space-y-3">
                                    {groupMatches.map((match) => (
                                        <div 
                                            key={match.ID} 
                                            className="bg-white rounded-lg shadow overflow-hidden"
                                        >
                                            <div 
                                                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => handleMatchClick(match.id || match.ID)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex-1 flex items-center justify-end">
                                                        <div className="text-right mr-2">
                                                            <div className="font-medium">{match.EQUIPO_LOCAL || 'Equipo local'}</div>
                                                        </div>
                                                        <img 
                                                            src={getTeamLogo(match.EQUIPO_LOCAL || '') || ''} 
                                                            alt={match.EQUIPO_LOCAL || 'Equipo local'} 
                                                            className="h-6 w-6 object-contain"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = '';
                                                                target.className = 'h-6 w-6 bg-gray-200 rounded-full';
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="mx-2 flex flex-col items-center">
                                                    {match.penalties && (
                                                        <div className="text-[10px] font-semibold text-gray-700 bg-yellow-100 px-2 py-0.5 rounded mb-1">
                                                            {`PENALES: ${match.penalties.home}-${match.penalties.away}`}
                                                        </div>
                                                    )}
                                                    <div className="font-bold text-lg bg-gray-100 px-3 py-1 rounded">
                                                        {match.goles_local !== null ? match.goles_local : '-'} - {match.goles_visita !== null ? match.goles_visita : '-'}
                                                    </div>
                                                </div>
                                                    
                                                    <div className="flex-1 flex items-center">
                                                        <img 
                                                            src={getTeamLogo(match.EQUIPO_VISITA || '') || ''} 
                                                            alt={match.EQUIPO_VISITA || 'Equipo visita'} 
                                                            className="h-6 w-6 object-contain mr-2"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = '';
                                                                target.className = 'h-6 w-6 bg-gray-200 rounded-full';
                                                            }}
                                                        />
                                                        <div className="font-medium">{match.EQUIPO_VISITA || 'Equipo visita'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Match details */}
                                            {selectedMatchId === (match.id || match.ID) && (
                                                <div className="border-t border-gray-100 p-3 bg-gray-50">
                                                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                                        {/* Left column - Home team goals */}
                                                        <div className="space-y-2">
                                                            {loadingScorers ? (
                                                                <div className="text-center py-2">Cargando...</div>
                                                            ) : match.scorers && match.scorers.length > 0 ? (
                                                                <>
                                                                    {match.scorers
                                                                        .filter(scorer => 
                                                                            (scorer.team === (match.EQUIPO_LOCAL || match.equipo_local) && scorer.evento === 'GOL') ||
                                                                            (scorer.team === (match.EQUIPO_VISITA || match.equipo_visita) && scorer.evento === 'AUTOGOL')
                                                                        )
                                                                        .map((scorer, idx) => (
                                                                            <div key={`home-${scorer.jug}-${idx}`} className="text-sm">
                                                                                {scorer.jug}{scorer.evento === 'AUTOGOL' ? ' (AG)' : ''} - {scorer.minutos.map(m => `${m}'`).join(', ')}
                                                                            </div>
                                                                        ))}
                                                                </>
                                                            ) : (
                                                                <div className="text-gray-500">-</div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Center column - Match info */}
                                                        <div className="space-y-2 text-center">
                                                            <div>
                                                                <div className="font-medium">Recinto:</div>
                                                                <div>{match.RECINTO || 'Por confirmar'}</div>
                                                            </div>
                                                            
                                                            <div>
                                                                <div className="font-medium">Hora:</div>
                                                                <div>
                                                                    {match.PROGRAMACION 
                                                                        ? new Date(match.PROGRAMACION).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                                                        : 'Por confirmar'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <div className="font-medium">Fecha:</div>
                                                                <div>
                                                                    {match.PROGRAMACION 
                                                                        ? new Date(match.PROGRAMACION).toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit', year: '2-digit'})
                                                                        : 'Por confirmar'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Right column - Away team goals */}
                                                        <div className="space-y-2 text-right">
                                                            {loadingScorers ? (
                                                                <div className="text-center py-2">Cargando...</div>
                                                            ) : match.scorers && match.scorers.length > 0 ? (
                                                                <>
                                                                    {match.scorers
                                                                        .filter(scorer => 
                                                                            (scorer.team === (match.EQUIPO_VISITA || match.equipo_visita) && scorer.evento === 'GOL') ||
                                                                            (scorer.team === (match.EQUIPO_LOCAL || match.equipo_local) && scorer.evento === 'AUTOGOL')
                                                                        )
                                                                        .map((scorer, idx) => (
                                                                            <div key={`away-${scorer.jug}-${idx}`} className="text-sm">
                                                                                {scorer.jug}{scorer.evento === 'AUTOGOL' ? ' (AG)' : ''} - {scorer.minutos.map(m => `${m}'`).join(', ')}
                                                                            </div>
                                                                        ))}
                                                                </>
                                                            ) : (
                                                                <div className="text-gray-500">-</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Matches;
