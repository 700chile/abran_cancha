// src/components/PlayerRosterManager.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Team {
    ID: number;
    NOMBRE: string;
}

interface Torneo {
    ID: number;
    NOMBRE: string;
    EDICION: string;
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

export default function PlayerRosterManager() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [playerNumber, setPlayerNumber] = useState('');
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [competitions, setCompetitions] = useState<Torneo[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<number | null>(2);

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
        const fetchTeams = async () => {
            if (!selectedCompetition) {
                setTeams([]);
                return;
            }

            try {
                const { data, error } = await supabase.rpc('teams_by_competition', { torneo: selectedCompetition });
                if (error) throw error;
                console.log('Teams data:', data); // Debug log
                
                if (data) {
                    // The RPC returns teams with id_equipo and nombre_equipo
                    const teamsData = Array.isArray(data) ? data : [];
                    
                    const formattedTeams = teamsData.map((team: any) => ({
                        ID: team.id_equipo,
                        NOMBRE: team.nombre_equipo || 'Equipo sin nombre'
                    } as Team));
                    
                    console.log('Formatted teams:', formattedTeams); // Debug log
                    setTeams(formattedTeams);
                }
            } catch (err) {
                console.error('Error fetching teams:', err);
                setError('Error fetching teams');
            }
        };
        fetchTeams();
    }, [selectedCompetition]);

    const checkJerseyNumber = async (teamId: number, number: number) => {
        const { data, error } = await supabase
            .from('plantel')
            .select('ID_JUGADORA')
            .eq('ID_EQUIPO', teamId)
            .eq('NUMERO', number);

        if (error) throw error;
        return data && data.length > 0;
    };

    const validateJerseyNumber = async (teamId: number, number: number) => {
        if (number < 1 || number > 99) {
            throw new Error('El número de camiseta debe estar entre 1 y 99');
        }
        if (await checkJerseyNumber(teamId, number)) {
            throw new Error('Este número de camiseta ya está en uso en este equipo');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !selectedTeam) {
            setError('Por favor, complete los campos obligatorios');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const number = playerNumber ? parseInt(playerNumber) : null;
            if (number !== null && isNaN(number)) {
                setError('Por favor, ingrese un número válido para la camiseta');
                return;
            }

            if (number !== null) {
                await validateJerseyNumber(selectedTeam!.ID, number);
            }

            const { data: existingPlayer, error: getPlayerError } = await supabase
                .from('jugadora')
                .select()
                .eq('PRIMER_NOMBRE', firstName)
                .eq('PRIMER_APELLIDO', lastName)
                .single();

            if (getPlayerError) {
                if (getPlayerError.code === 'PGRST116') {
                    console.log('No existing player found, creating new player');
                } else {
                    throw getPlayerError;
                }
            }

            let playerId: string;
            if (existingPlayer && existingPlayer.ID) {
                playerId = existingPlayer.ID;
            } else {
                const { data: newPlayer, error: createPlayerError } = await supabase
                    .from('jugadora')
                    .insert([
                        {
                            PRIMER_NOMBRE: firstName,
                            PRIMER_APELLIDO: lastName,
                            TIPO: 'JUGADORA'
                        }
                    ])
                    .select('ID')
                    .single();

                if (createPlayerError) throw createPlayerError;
                playerId = newPlayer!.ID;
            }

            const { error: plantelError } = await supabase
                .from('plantel')
                .insert([
                    {
                        ID_JUGADORA: playerId,
                        ID_EQUIPO: selectedTeam!.ID,
                        NUMERO: number,
                        POSICION: selectedPosition || null
                    }
                ]);

            if (plantelError) throw plantelError;

            setSuccess('Jugadora agregada exitosamente');
            setTimeout(() => {
                setSuccess('');
            }, 3000);
            setFirstName('');
            setLastName('');
            setPlayerNumber('');
            setSelectedPosition('');
            setSelectedTeam(null);
        } catch (err) {
            console.error('Error:', err);
            setError('Error al agregar la jugadora');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
                    INGRESAR JUGADORA
                </h1>

                <div className="bg-white rounded-lg shadow-md p-6">
                    {success && (
                        <div className="bg-green-50 text-green-500 p-2 rounded mb-4">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-500 p-2 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Apellido
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Torneo
                            </label>
                            <select
                                value={selectedCompetition || ''}
                                onChange={(e) => {
                                    const competitionId = parseInt(e.target.value);
                                    setSelectedCompetition(competitionId || null);
                                }}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="">Seleccione un torneo</option>
                                {competitions.map((competition: Torneo) => (
                                    <option key={competition.ID} value={competition.ID}>
                                        {`${competition.NOMBRE} - ${competition.EDICION}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Equipo
                            </label>
                            <select
                                value={selectedTeam?.ID || ''}
                                onChange={(e) => {
                                    const teamId = parseInt(e.target.value);
                                    setSelectedTeam(teams.find(t => t.ID === teamId) || null);
                                }}
                                className="w-full p-2 border rounded"
                                required
                                disabled={!selectedCompetition || loading}
                            >
                                <option key="select-team" value="">
                                    {loading ? 'Cargando equipos...' : 'Seleccione un equipo'}
                                </option>
                                {teams && teams.length > 0 ? (
                                    teams.map((team: Team) => (
                                        team && team.ID ? (
                                            <option key={`team-${team.ID}`} value={team.ID}>
                                                {team.NOMBRE}
                                            </option>
                                        ) : null
                                    ))
                                ) : (
                                    <option key="no-teams" value="" disabled>
                                        No hay equipos disponibles para este torneo
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número de Camiseta (opcional)
                            </label>
                            <input
                                type="number"
                                value={playerNumber}
                                onChange={(e) => setPlayerNumber(e.target.value)}
                                className="w-full p-2 border rounded"
                                min="1"
                                max="99"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Posición (opcional)
                            </label>
                            <select
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                {POSITION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Guardando...' : 'Guardar Jugadora'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
