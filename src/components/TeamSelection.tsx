import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { RoundConfig } from '../types';


interface Team {
    ID: number;
    NOMBRE: string;
    CHAPA?: string;
}

interface TeamGroupAssignment {
    groupID: number;
    teamID: number;
}

const TeamSelection: React.FC = () => {
    const { competitionID } = useParams<{ competitionID: string }>();
    const [competition, setCompetition] = useState<{ NOMBRE: string; EDICION: string; } | null>(null);
    const [rounds, setRounds] = useState<RoundConfig[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeams, setSelectedTeams] = useState<TeamGroupAssignment[]>([]);
    const navigate = useNavigate();
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!competitionID) return;
        
        const fetchCompetitionData = async () => {
            try {
                // Get competition details
                const { data: competitionData, error: compError } = await supabase
                    .from('campeonato')
                    .select('*')
                    .eq('ID', competitionID)
                    .single();

                if (compError) throw compError;
                setCompetition(competitionData);

                // Get rounds and groups
                const { data: roundsData, error: roundsError } = await supabase
                    .from('ronda')
                    .select('*')
                    .eq('ID_CAMPEONATO', competitionID)
                    .order('ID');

                if (roundsError) throw roundsError;

                const roundsWithGroups = await Promise.all(
                    roundsData.map(async (round) => {
                        const { data: groupsData } = await supabase
                            .from('grupo')
                            .select('*')
                            .eq('ID_RONDA', round.ID)
                            .order('ID');
                        return {
                            ...round,
                            GRUPOS: groupsData
                        };
                    })
                );

                setRounds(roundsWithGroups);

                // Get teams based on competition type
                const teamType = competitionData.TIPO === 'COPA SELECCIONES FEDERACION' ? 'SELECCION_NACIONAL' : 'CLUB';
                const { data: teamsData } = await supabase.rpc('get_teams', { team_type: teamType });
                setTeams(teamsData);

            } catch (error) {
                console.error('Error fetching data:', error);
                setMessage('Error al cargar los datos. Por favor, intenta nuevamente.');
            }
        };

        fetchCompetitionData();
    }, [competitionID]);

    const handleTeamSelection = (groupID: number, teamID: number) => {
        setSelectedTeams(prev => {
            const existingIndex = prev.findIndex(t => t.groupID === groupID);
            if (existingIndex >= 0) {
                return [...prev.slice(0, existingIndex), { groupID, teamID }, ...prev.slice(existingIndex + 1)];
            }
            return [...prev, { groupID, teamID }];
        });
    };

    const handleSubmit = async () => {
        try {
            if (!competitionID) {
                throw new Error('No competition ID provided');
            }
            const competitionIdNum = parseInt(competitionID, 10);
            if (isNaN(competitionIdNum)) {
                throw new Error('Invalid competition ID');
            }

            const { error: transactionError } = await supabase.rpc('assign_teams_to_groups', {
                competition_id: competitionIdNum,
                team_assignments: JSON.stringify(selectedTeams)
            });

            if (transactionError) throw transactionError;

            setMessage('Equipos asignados exitosamente');
            setTimeout(() => {
                navigate(`/competition/${competitionID}`);
            }, 2000);
        } catch (error) {
            console.error('Error assigning teams:', error);
            setMessage('Error al asignar los equipos. Por favor, intenta nuevamente.');
        }
    };

    if (!competition || !rounds.length) {
        return <div>Cargando...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Asignar Equipos a Grupos</h1>
            
            <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Competencia: {competition.NOMBRE} {competition.EDICION}</h2>
                    </div>

                    {rounds.map((round) => (
                        <div key={round.ID} className="space-y-4">
                            <h3 className="text-md font-medium text-gray-900">{round.NOMBRE}</h3>
                            {round.GRUPOS.map((group) => (
                                <div key={group.ID} className="border rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">{group.NOMBRE}</h4>
                                    <select
                                        value={selectedTeams.find(t => t.groupID === group.ID)?.teamID || ''}
                                        onChange={(e) => handleTeamSelection(group.ID, parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar equipo...</option>
                                        {teams.map((team) => (
                                            <option key={team.ID} value={team.ID}>
                                                {team.NOMBRE} {team.CHAPA ? `(${team.CHAPA})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    ))}

                    <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedTeams.length !== rounds.reduce((acc, round) => acc + round.GRUPOS.length, 0)}
                    >
                        Asignar Equipos
                    </button>
                </div>
            </div>

            {message && (
                <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda' }}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default TeamSelection;
