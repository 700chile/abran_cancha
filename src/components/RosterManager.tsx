import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface Torneo {
    ID: number;
    NOMBRE: string;
    EDICION: string;
}

interface RosterManagerProps {
    onRosterSaved?: () => void;
}

interface PlayerInput {
    ID_JUGADORA: string;
    primerNombre: string;
    primerApellido: string;
    number: string;
    position: string;
}

interface Team {
    id?: number;
    nombre?: string;
    id_equipo?: number;
    nombre_equipo?: string;
}



const POSITION_OPTIONS = [
    { value: '', label: 'Seleccione una posición' },
    { value: 'ARQUERA', label: 'Arquera' },
    { value: 'CENTRAL', label: 'Central' },
    { value: 'LATERAL', label: 'Lateral' },
    { value: 'MEDIOCAMPISTA', label: 'Mediocampista' },
    { value: 'EXTREMA', label: 'Extrema' },
    { value: 'DELANTERA', label: 'Delantera' }
];

export const RosterManager: React.FC<RosterManagerProps> = ({ onRosterSaved }) => {
    const [competitions, setCompetitions] = useState<Torneo[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<PlayerInput[]>(() => {
        const initialPlayers = [];
        for (let i = 0; i < 23; i++) {
            initialPlayers.push({
                ID_JUGADORA: `PLAYER-${i}`,
                primerNombre: '',
                primerApellido: '',
                number: '',
                position: ''
            });
        }
        return initialPlayers;
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [rosterExists, setRosterExists] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                const { data, error } = await supabase
                    .from('campeonato')
                    .select('ID, NOMBRE, EDICION')
                    .order('NOMBRE');

                if (error) throw error;
                setCompetitions(data || []);
            } catch (err) {
                console.error('Error fetching competitions:', err);
                setError('Error fetching competitions');
            }
        };
        fetchCompetitions();
    }, []);

    useEffect(() => {
        if (selectedCompetition) {
            const fetchTeams = async () => {
                try {
                    console.log('Fetching teams for competition:', selectedCompetition);
                    const { data, error } = await supabase
                        .rpc('teams_by_competition', { torneo: parseInt(selectedCompetition.toString()) });

                    if (error) {
                        console.error('RPC error:', error);
                        throw error;
                    }

                    console.log('Teams data received:', data);
                    if (!data) {
                        console.log('No data received from RPC');
                        setTeams([]);
                        return;
                    }

                    // Ensure we have an array
                    const teamsArray = Array.isArray(data) ? data : [data];
                    console.log('Teams array:', teamsArray);
                    
                    // Log the first item's structure
                    if (teamsArray.length > 0) {
                        console.log('First team structure:', teamsArray[0]);
                    }

                    setTeams(teamsArray as Team[]);
                } catch (err) {
                    console.error('Error fetching teams:', err);
                    setError('Error fetching teams');
                }
            };
            fetchTeams();
        }
    }, [selectedCompetition]);

    useEffect(() => {
        const checkRosterExists = async () => {
            try {
                if (!selectedTeam) return;

                const { data, error } = await supabase
                    .rpc('get_roster_with_names', { team_id: selectedTeam });

                if (error) {
                    console.error('Error checking roster:', error);
                    throw error;
                }

                if (data && data.length > 0) {
                    setRosterExists(true);
                    console.log('Found existing roster:', data);
                } else {
                    setRosterExists(false);
                }
            } catch (err) {
                console.error('Error checking roster:', err);
                setError('Error checking roster');
            }
        };

        checkRosterExists();
    }, [selectedTeam]);

    const handleTeamChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedTeamId = event.target.value;
        console.log('Team selected:', selectedTeamId);
        
        setPlayers([]);
        setRosterExists(false);
        
        const teamNumber = selectedTeamId ? parseInt(selectedTeamId) : null;
        setSelectedTeam(teamNumber);

        if (teamNumber) {
            const { data: rosterData, error: rosterError } = await supabase
                .rpc('get_roster_with_names', { team_id: teamNumber });

            if (rosterError) {
                console.error('Error reloading roster:', rosterError);
                setError('Error reloading roster');
                return;
            }

            if (rosterData && Array.isArray(rosterData) && rosterData.length > 0) {
                setRosterExists(true);
                const playerInputs = rosterData.map((player: any) => ({
                    ID_JUGADORA: player.ID_JUGADORA.toString(),
                    primerNombre: player.PRIMER_NOMBRE || '',
                    primerApellido: player.PRIMER_APELLIDO || '',
                    number: player.NUMERO || '',
                    position: player.POSICION || ''
                }));
                setPlayers(playerInputs);
            } else {
                setRosterExists(false);
                setPlayers(Array(23).fill(null).map((_, index) => ({
                    ID_JUGADORA: `PLAYER-${index}`,
                    primerNombre: '',
                    primerApellido: '',
                    number: '',
                    position: ''
                })));
            }
        }
    };

    const handlePlayerChange = (ID_JUGADORA: string, field: string, value: string) => {
        setPlayers(prevPlayers => prevPlayers.map(player =>
            player.ID_JUGADORA === ID_JUGADORA ? { ...player, [field]: value } : player
        ));
    };

    const saveRoster = async () => {
        try {
            if (!selectedTeam) {
                setError('Por favor, seleccione un equipo');
                return;
            }

            // First, check for existing players in the jugadora table
            const { data: existingPlayersData, error: existingPlayersError } = await supabase
                .from('jugadora')
                .select('ID, PRIMER_NOMBRE, PRIMER_APELLIDO')
                .in('PRIMER_NOMBRE', players.map((player: PlayerInput) => player.primerNombre))
                .in('PRIMER_APELLIDO', players.map((player: PlayerInput) => player.primerApellido));

            if (existingPlayersError) {
                console.error('Error checking existing players:', existingPlayersError);
                setError('Error checking existing players');
                return;
            }

            // Get the existing players and their IDs
            const existingPlayers: number[] = existingPlayersData?.map(p => p.ID) || [];
            const existingPlayersMap = new Map<string, number>();
            existingPlayersData?.forEach(p => {
                existingPlayersMap.set(`${p.PRIMER_NOMBRE} ${p.PRIMER_APELLIDO}`, p.ID);
            });

            console.log('Existing players IDs:', existingPlayers);

            // Prepare player data with proper types
            const playerData: Array<{
                is_new: boolean;
                PRIMER_NOMBRE: string;
                PRIMER_APELLIDO: string;
                NUMERO: string;
                POSICION: string | null;
                ID_JUGADORA: number | null;
            }> = players.map((player: PlayerInput) => {
                const existingId = existingPlayersMap.get(`${player.primerNombre} ${player.primerApellido}`);
                return {
                    is_new: !existingId,
                    PRIMER_NOMBRE: player.primerNombre,
                    PRIMER_APELLIDO: player.primerApellido,
                    NUMERO: player.number,
                    POSICION: player.position || null,
                    ID_JUGADORA: existingId || null
                };
            });

            console.log('Player data array:', playerData);

            // Call the RPC function
            const { error: saveError } = await supabase
                .rpc('save_roster_with_existing', {
                    existing_players: existingPlayers,
                    new_players: playerData.filter((player: any) => player.is_new).map((player) => ({
                        PRIMER_NOMBRE: player.PRIMER_NOMBRE,
                        PRIMER_APELLIDO: player.PRIMER_APELLIDO,
                        POSICION: player.POSICION,
                        NUMERO: player.NUMERO
                    })),
                    team_id: selectedTeam,
                    player_data: playerData as any
                });

            if (saveError) {
                console.error('Database error:', saveError);
                setError(saveError.message);
                return;
            }

            if (onRosterSaved) {
                onRosterSaved();
            }

            setSuccess('El plantel ha sido guardado exitosamente');
            setTimeout(() => setSuccess(null), 3000);

            // Clear existing players and reload roster
            setPlayers(Array(23).fill(null).map((_, index) => ({
                ID_JUGADORA: `PLAYER-${index}`,
                primerNombre: '',
                primerApellido: '',
                number: '',
                position: ''
            })));
            setRosterExists(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error saving roster');
            console.error(err);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Ingresar Plantel</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Torneo</label>
                <select
                    value={selectedCompetition?.toString() || ''}
                    onChange={(e) => setSelectedCompetition(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                >
                    <option value="">Seleccione un torneo</option>
                    {competitions.map((torneo) => (
                        <option key={torneo.ID} value={torneo.ID.toString()}>
                            {torneo.NOMBRE} - {torneo.EDICION}
                        </option>
                    ))}
                </select>
            </div>

            {selectedCompetition && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Equipo</label>
                    <select
                        value={selectedTeam?.toString() || ''}
                        onChange={handleTeamChange}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Seleccione un equipo</option>
                        {teams?.length > 0 ? (
                            teams.map((team, idx) => {
                                const idValue = team.id ?? team.id_equipo;
                                const nameValue = team.nombre ?? team.nombre_equipo ?? '';
                                return (
                                    <option key={idValue?.toString() ?? `team-${idx}`} value={idValue?.toString() ?? ''}>
                                        {nameValue}
                                    </option>
                                );
                            })
                        ) : (
                            <option value="">Cargando equipos...</option>
                        )}
                    </select>
                </div>
            )}

            {success && (
                <div className="text-green-600 mb-4">
                    {success}
                </div>
            )}

            {error && (
                <div className="text-red-600 mb-4">
                    {error}
                </div>
            )}

            {selectedTeam && (
                <div className="mt-4">
                    {rosterExists ? (
                        <div className="text-red-600 font-bold">
                            El plantel de este equipo ya ha sido ingresado.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {players.map((player, index) => (
                                <div key={index} className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            value={player.primerNombre}
                                            onChange={(e) => handlePlayerChange(player.ID_JUGADORA, 'primerNombre', e.target.value)}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Apellido</label>
                                        <input
                                            type="text"
                                            value={player.primerApellido}
                                            onChange={(e) => handlePlayerChange(player.ID_JUGADORA, 'primerApellido', e.target.value)}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">N°</label>
                                        <input
                                            type="text"
                                            value={player.number}
                                            onChange={(e) => handlePlayerChange(player.ID_JUGADORA, 'number', e.target.value)}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Posición</label>
                                        <select
                                            value={player.position}
                                            onChange={(e) => handlePlayerChange(player.ID_JUGADORA, 'position', e.target.value)}
                                            className="w-full p-2 border rounded"
                                        >
                                            {POSITION_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {selectedTeam && !rosterExists && (
                <button
                    onClick={saveRoster}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Guardar Plantel
                </button>
            )}
        </div>
    );
};

export default RosterManager;
