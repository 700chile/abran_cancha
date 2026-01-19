// src/components/MatchUpdater.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getTeamLogo } from '../utils/teamLogos';
import { getPosterLogo } from '../utils/posterLogos';
import { renderScheduleImage, type PosterMatch } from './PosterScheduleCanvas';
// If you place the background at src/assets/posters/schedule_bg.png, this import will resolve
// and Vite will serve the optimized asset URL in production.
import scheduleBg from '../assets/posters/schedule_bg.png';

// Helper type to handle string | null | undefined
type SafeString = string | null | undefined;

// Helper type for team logo props
interface TeamLogoProps {
    teamName: string | null;  // Updated to only allow string or null
    className?: string;
}
import VenueAutocomplete from './VenueAutocomplete';


interface Competition {
    ID: number;
    NOMBRE: string;
    EDICION: string;
}

interface Matchday {
    fecha: string;
}

interface Match {
    id: number;
    id_campeonato: number;
    fecha: string;
    equipo_local: string | null;
    goles_local: number | null;
    goles_visita: number | null;
    equipo_visita: string | null;
    programacion: string;
    recinto: string | null;
    nombre_grupo: string;
}

export default function MatchUpdater() {
    const [selectedMatchday, setSelectedMatchday] = useState<string>('');
    const [selectedCompetition, setSelectedCompetition] = useState<number | null>(2);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [matchdays, setMatchdays] = useState<Matchday[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showScoresModal, setShowScoresModal] = useState(false);
    const [recinto, setRecinto] = useState<string>('');
    const [programacion, setProgramacion] = useState<string>('');
    const [localGoals, setLocalGoals] = useState<string>('0');
    const [visitGoals, setVisitGoals] = useState<string>('0');
    const [selectedMatchForUpdate, setSelectedMatchForUpdate] = useState<Match | null>(null);
    const [localTeam, setLocalTeam] = useState<string>('');
    const [visitTeam, setVisitTeam] = useState<string>('');
    const [isUpdatingPositions, setIsUpdatingPositions] = useState<boolean>(false);
    const [updateStatus, setUpdateStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
    
    // Helper function to safely convert string | null | undefined to string
    const safeString = (value: SafeString): string => value ?? '';
    
    // TeamLogo component to safely render team logos
    const TeamLogo: React.FC<TeamLogoProps> = ({ teamName, className = 'w-6 h-6 rounded-full' }) => {
        if (!teamName) return <div className={className} />;
        const logo = getTeamLogo(teamName);
        if (!logo) return <div className={className} />;
        return <img src={logo} alt={teamName} className={className} />;
    };

    const handleGeneratePoster = async () => {
        try {
            if (!selectedMatchday || !selectedCompetition) return;
            const comp = competitions.find(c => c.ID === selectedCompetition);
            const posterMatches: PosterMatch[] = matches.map((m) => ({
                local: m.equipo_local,
                visita: m.equipo_visita,
                estadio: m.recinto,
                programacion: m.programacion,
            }));
            // Build header texts per requested rules
            const competitionTitle = comp ? `CAMPEONATO ${comp.EDICION}` : 'CAMPEONATO';
            const isNumericFecha = /^\d+$/.test(selectedMatchday.trim());
            const roundTitle = isNumericFecha
                ? `PROGRAMACIÓN FECHA ${selectedMatchday}`
                : `PROGRAMACIÓN ${selectedMatchday.toUpperCase()}`;

            const dataUrl = await renderScheduleImage(posterMatches, {
                backgroundUrl: scheduleBg,
                competitionTitle,
                divisionTitle: 'PRIMERA DIVISIÓN',
                roundTitle,
                pixelRatio: 2,
                // Use poster-specific logo mapping for the image only
                getLogoUrl: (name) => getPosterLogo(name || ''),
            });
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `programacion_${selectedMatchday}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error('Error generando imagen', e);
            alert('No se pudo generar la imagen. Revisa la consola para más detalles.');
        }
    };

    const isSuspendedMatch = (match: Match) => {
        return match.recinto?.toUpperCase().includes('SUSPENDIDO') || false;
    };
    
    // Helper function to safely get team name with fallback
    const getTeamName = (teamName: string | null | undefined): string => {
        return teamName || 'SIN ASIGNAR';
    };
    
    // TeamLogo component is used to safely render team logos with fallback

    const formatTime = (time: string) => {
        const date = new Date(time);
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dayName = days[date.getDay()];
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthName = months[date.getMonth()];
        
        return `${dayName} ${day} ${monthName} ${hours}:${minutes}`;
    };

    const handleUpdateScores = (match: Match) => {
        setSelectedMatchForUpdate(match);
        setLocalGoals(match.goles_local?.toString() ?? '0');
        setVisitGoals(match.goles_visita?.toString() ?? '0');
        setShowScoresModal(true);
    };

    const handleUpdateDetails = (match: Match) => {
        setSelectedMatchForUpdate(match);
        setRecinto(safeString(match.recinto));
        setProgramacion(safeString(match.programacion));
        setLocalTeam(safeString(match.equipo_local));
        setVisitTeam(safeString(match.equipo_visita));
        setShowDetailsModal(true);
    };

    const handleUpdateScoresSubmit = async () => {
        if (!selectedMatchForUpdate) {
            console.error('No match selected for update');
            return;
        }

        try {
            const localGoalsNum = parseInt(localGoals);
            const visitGoalsNum = parseInt(visitGoals);
            
            if (isNaN(localGoalsNum) || isNaN(visitGoalsNum)) {
                alert('Por favor, ingresa números válidos para los goles.');
                return;
            }
            
            if (localGoalsNum < 0 || visitGoalsNum < 0) {
                alert('Los goles no pueden ser números negativos.');
                return;
            }

            const { error: updateError } = await supabase
                .from('partido')
                .update({
                    goles_local: localGoalsNum,
                    goles_visita: visitGoalsNum
                })
                .eq('ID', selectedMatchForUpdate.id);

            if (updateError) throw updateError;

            setShowScoresModal(false);
            setLocalGoals('0');
            setVisitGoals('0');
            setSelectedMatchForUpdate(null);
            await fetchMatches();
        } catch (error) {
            console.error('Error updating scores:', error);
            alert('Error actualizando los goles. Por favor, intenta nuevamente.');
        }
    };

    const handleUpdateDetailsSubmit = async () => {
        if (!selectedMatchForUpdate) {
            console.error('No match selected for update');
            return;
        }

        try {
            const { error: updateError } = await supabase
                .from('partido')
                .update({
                    RECINTO: recinto,
                    PROGRAMACION: programacion
                    // Remove team updates as they should be handled separately
                    // and the columns expect integer IDs, not team names
                })
                .eq('ID', selectedMatchForUpdate.id);

            if (updateError) throw updateError;

            setShowDetailsModal(false);
            setRecinto('');
            setProgramacion('');
            setLocalTeam('');
            setVisitTeam('');
            setSelectedMatchForUpdate(null);
            await fetchMatches();
        } catch (error) {
            console.error('Error updating details:', error);
            alert('Error actualizando los detalles. Por favor, intenta nuevamente.');
        }
    };

    const fetchMatches = async () => {
        if (!selectedMatchday || !selectedCompetition) return;

        try {
            const { data, error } = await supabase.rpc('get_games_by_gameday', {
                fecha_param: selectedMatchday,
                torneo_param: selectedCompetition
            });

            if (error) throw error;

            const transformedData = data?.map((match: any) => ({
                ...match,
                nombre_grupo: match.nombre_grupo || 'Sin Grupo',
                equipo_local: match.equipo_local || 'SIN ASIGNAR',
                equipo_visita: match.equipo_visita || 'SIN ASIGNAR'
            })) || [];

            setMatches(transformedData);
        } catch (error) {
            console.error('Error fetching matches:', error);
            setMatches([]);
        }
    };

    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                const { data } = await supabase.from('campeonato').select('ID, NOMBRE, EDICION');
                if (data) {
                    setCompetitions(data);
                    setSelectedCompetition(2);
                }
            } catch (error) {
                console.error('Error fetching competitions:', error);
            }
        };
        fetchCompetitions();
    }, []);

    useEffect(() => {
        if (selectedMatchday && selectedCompetition) {
            fetchMatches();
        }
    }, [selectedMatchday, selectedCompetition]);

    useEffect(() => {
        const fetchMatchdays = async () => {
            if (!selectedCompetition) return;

            try {
                const { data: minFecha } = await supabase.rpc('get_min_fecha_by_grupo', {
                    torneo: selectedCompetition
                });

                const { data: matchdaysData } = await supabase.rpc('get_distinct_fecha_by_grupo', { 
                    param_torneo: selectedCompetition
                });

                if (matchdaysData) {
                    setMatchdays(matchdaysData);
                    if (minFecha) {
                        setSelectedMatchday(minFecha);
                    } else {
                        setSelectedMatchday('');
                    }
                }
            } catch (error) {
                console.error('Error fetching matchdays:', error);
                setSelectedMatchday('');
            }
        };

        fetchMatchdays();
    }, [selectedCompetition]);

    const handleUpdatePositions = async () => {
        if (!selectedMatchday || !selectedCompetition) return;

        setIsUpdatingPositions(true);
        setUpdateStatus(null);

        try {
            // Get all groups for the selected competition and matchday
            const { data: groupsData, error: groupsError } = await supabase
                .rpc('get_groups_by_torneo_fecha', {
                    torneo: selectedCompetition,
                    fecha: selectedMatchday
                });

            if (groupsError) throw groupsError;
            if (!groupsData || groupsData.length === 0) {
                throw new Error('No se encontraron grupos para actualizar');
            }

            // For each group, update positions
            for (const group of groupsData) {
                const grupoId = group.grupo_id;
                
                // Update positions using the combined function that handles both pos_ant and posicion
                const { error: updatePosError } = await supabase.rpc('update_posicion_from_standings', {
                    grupo_id: grupoId
                });

                if (updatePosError) throw updatePosError;
            }

            setUpdateStatus({
                type: 'success',
                message: 'Posiciones actualizadas correctamente.'
            });
        } catch (error) {
            console.error('Error updating positions:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setUpdateStatus({
                type: 'error',
                message: `Error al actualizar posiciones: ${errorMessage}`
            });
        } finally {
            setIsUpdatingPositions(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="mb-4">
                <div className="space-y-4">
                    <select
                        value={selectedCompetition || ''}
                        onChange={(e) => {
                            const selectedId = parseInt(e.target.value);
                            setSelectedCompetition(selectedId);
                            setSelectedMatchday('');
                        }}
                        className="w-64 p-2 border rounded"
                    >
                        <option key="competition-empty" value="">Selecciona un campeonato</option>
                        {competitions.map((comp, index) => (
                            <option key={`competition-${comp.ID}-${index}`} value={comp.ID}>
                                {`${comp.NOMBRE} - ${comp.EDICION}`}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedMatchday}
                        onChange={(e) => setSelectedMatchday(e.target.value)}
                        className="w-64 p-2 border rounded"
                    >
                        <option key="matchday-empty" value="">Selecciona una fecha</option>
                        {matchdays.map((matchday, index) => (
                            <option key={`matchday-${matchday.fecha}-${index}`} value={matchday.fecha}>
                                {matchday.fecha}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Actualizador de Partidos</h2>
            </div>

            <div className="overflow-x-auto">
                {matches.length === 0 ? (
                    <div className="text-center py-4">
                        No hay partidos para esta fecha
                    </div>
                ) : (
                    // Group matches by nombre_grupo
                    (() => {
                        const groups = matches.reduce((groups: { [key: string]: Match[] }, match: Match) => {
                            const groupName = match.nombre_grupo;
                            if (!groups[groupName]) {
                                groups[groupName] = [];
                            }
                            groups[groupName].push(match);
                            return groups;
                        }, {} as { [key: string]: Match[] });

                        return Object.entries(groups).map(([groupName, groupMatches]) => (
                            <div key={groupName} className="mb-6">
                                <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-700">
                                    {groupName}
                                </div>
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-4 py-2">Local</th>
                                            <th className="px-4 py-2">Resultado</th>
                                            <th className="px-4 py-2">Visitante</th>
                                            <th className="px-4 py-2">Recinto</th>
                                            <th className="px-4 py-2">Programación</th>
                                            <th className="px-4 py-2">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupMatches.map((match, index) => (
                                            <tr key={`match-${match.id}-${index}`} className={`hover:bg-gray-50 ${isSuspendedMatch(match) ? 'bg-red-50' : ''}`}>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative">
                                                            <TeamLogo teamName={match.equipo_local} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="font-medium">{getTeamName(match.equipo_local)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    {isSuspendedMatch(match) ? (
                                                        <span className="text-red-600 font-bold">SUSPENDIDO</span>
                                                    ) : match.goles_local === null && match.goles_visita === null ? (
                                                        <span className="text-black">VS</span>
                                                    ) : (
                                                        `${match.goles_local} - ${match.goles_visita}`
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative">
                                                            <TeamLogo teamName={match.equipo_visita} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="font-medium">{getTeamName(match.equipo_visita)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">{match.recinto || 'SIN ASIGNAR'}</td>
                                                <td className="px-4 py-2">{formatTime(match.programacion)}</td>
                                                <td className="px-4 py-2">
                                                    <button
                                                        onClick={() => handleUpdateDetails(match)}
                                                        className="text-blue-500 hover:text-blue-700 px-2"
                                                    >
                                                        Detalles
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateScores(match)}
                                                        className="text-green-500 hover:text-green-700 px-2"
                                                    >
                                                        Goles
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ));
                    })()
                )}
            </div>

            {showDetailsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <TeamLogo 
                                        teamName={localTeam} 
                                        className="w-8 h-8"
                                    />
                                    <span className="font-semibold">{getTeamName(localTeam)}</span>
                                </div>
                                <span className="text-gray-500">VS</span>
                                <div className="flex items-center gap-2">
                                    <TeamLogo 
                                        teamName={visitTeam} 
                                        className="w-8 h-8"
                                    />
                                    <span className="font-semibold">{getTeamName(visitTeam)}</span>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold mb-4">Actualizar Detalles</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Recinto</label>
                                    <VenueAutocomplete
                                        value={recinto}
                                        onChange={setRecinto}
                                        placeholder="Seleccione un recinto"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Programación</label>
                                    <input
                                        type="datetime-local"
                                        value={programacion}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProgramacion(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            setRecinto('');
                                            setProgramacion('');
                                            setLocalTeam('');
                                            setVisitTeam('');
                                        }}
                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUpdateDetailsSubmit}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Actualizar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showScoresModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <TeamLogo 
                                        teamName={selectedMatchForUpdate?.equipo_local || null}
                                        className="w-8 h-8"
                                    />
                                    <span className="font-semibold">{getTeamName(selectedMatchForUpdate?.equipo_local)}</span>
                                </div>
                                <span className="text-gray-500">VS</span>
                                <div className="flex items-center gap-2">
                                    <TeamLogo 
                                        teamName={selectedMatchForUpdate?.equipo_visita || null}
                                        className="w-8 h-8"
                                    />
                                    <span className="font-semibold">{getTeamName(selectedMatchForUpdate?.equipo_visita)}</span>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold mb-4">Actualizar Goles</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Goles Local</label>
                                    <input
                                        type="number"
                                        value={localGoals}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalGoals(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Goles Visitante</label>
                                    <input
                                        type="number"
                                        value={visitGoals}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVisitGoals(e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => {
                                            setShowScoresModal(false);
                                            setLocalGoals('');
                                            setVisitGoals('');
                                        }}
                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUpdateScoresSubmit}
                                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Actualizar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Position Updater Section - Fixed at bottom of page */}
            {selectedMatchday && selectedCompetition && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 shadow-inner">
                    <div className="w-full flex justify-end items-center gap-4">
                        {updateStatus && (
                            <div className={`p-3 rounded-md shadow-lg max-w-xs ${
                                updateStatus.type === 'success' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-sm">{updateStatus.message}</span>
                                    <button 
                                        onClick={() => setUpdateStatus(null)}
                                        className="text-gray-500 hover:text-gray-700 text-lg leading-none"
                                        aria-label="Cerrar notificación"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleUpdatePositions}
                            disabled={isUpdatingPositions}
                            className={`px-6 py-2 rounded-lg text-white shadow flex items-center gap-2 transition-all ${
                                isUpdatingPositions 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                            }`}
                        >
                            {isUpdatingPositions ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Actualizando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                    Actualizar Posiciones
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleGeneratePoster}
                            className="px-6 py-2 rounded-lg text-white shadow bg-indigo-600 hover:bg-indigo-700 transition-all"
                        >
                            Generar imagen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
