import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface PlayerRoster {
    ID_JUGADORA: string;
    ID_EQUIPO: number;
    NUMERO: number | null;
    POSICION: string | null;
}

// Interfaces for our data models
interface Team {
    id: number;
    nombre: string;
}

interface Group {
    ID: number;
    NOMBRE: string;
    ID_RONDA: number;
    EQUIPOS_CANT: number;
}

interface Competition {
    ID: number;
    NOMBRE: string;
    EDICION: string;
}

interface Round {
    ID: number;
    NOMBRE: string;
}

interface TeamSelectorProps {
    competitionId: string;
    roundId?: string;
}

const TeamSelector: FC<TeamSelectorProps> = ({ competitionId, roundId: initialRoundIdFromProps }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const isMounted = useRef(true);

    // State
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [round, setRound] = useState<Round | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const selectedRoundId = initialRoundIdFromProps ? parseInt(initialRoundIdFromProps, 10) : null;
    const [selectedTeams, setSelectedTeams] = useState<Record<number, number[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);

    // Filter groups by selected round
    const filteredGroups = useMemo(() => {
        if (!selectedRoundId) return [];
        return groups.filter(group => group.ID_RONDA === selectedRoundId);
    }, [groups, selectedRoundId]);

    // Remove the round parameter from URL if it exists in search params
    useEffect(() => {
        if (searchParams.has('round')) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('round');
            setSearchParams(newSearchParams);
        }
    }, [searchParams, setSearchParams]);

    // Load data on component mount
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (!competitionId) return;

            try {
                console.log('Starting data fetch...');
                setIsLoading(true);
                setError('');

                // Fetch competition data
                console.log('Fetching competition data...');
                const { data: competitionData, error: competitionError } = await supabase
                    .from('campeonato')
                    .select('*')
                    .eq('ID', competitionId)
                    .single();

                if (competitionError) throw competitionError;
                if (!isMounted) return;
                
                console.log('Competition data loaded');
                setCompetition(competitionData);

                // Fetch round data if roundId is provided
                if (selectedRoundId) {
                    console.log('Fetching round data...');
                    const { data: roundData, error: roundError } = await supabase
                        .from('ronda')
                        .select('*')
                        .eq('ID', selectedRoundId)
                        .single();

                    if (roundError) throw roundError;
                    if (!isMounted) return;
                    
                    console.log('Round data loaded');
                    setRound(roundData);

                    // Fetch groups for this round
                    console.log('Fetching groups...');
                    const { data: groupsData, error: groupsError } = await supabase
                        .from('grupo')
                        .select('*')
                        .eq('ID_RONDA', selectedRoundId);

                    if (groupsError) throw groupsError;
                    if (!isMounted) return;
                    
                    console.log('Groups loaded:', groupsData);
                    setGroups(groupsData || []);

                    // Initialize selectedTeams with empty arrays for each group
                    const initialSelectedTeams: Record<number, number[]> = {};
                    groupsData?.forEach(group => {
                        initialSelectedTeams[group.ID] = [];
                    });
                    setSelectedTeams(initialSelectedTeams);

                    // Load existing team assignments
                    console.log('Loading existing team assignments...');
                    const { data: assignments, error: assignmentsError } = await supabase
                        .from('equipo_grupo')
                        .select('ID_GRUPO, ID_EQUIPO')
                        .in('ID_GRUPO', groupsData.map(g => g.ID));

                    if (assignmentsError) throw assignmentsError;
                    if (!isMounted) return;

                    // Update selectedTeams with existing assignments
                    const updatedSelectedTeams = { ...initialSelectedTeams };
                    assignments?.forEach(assignment => {
                        if (updatedSelectedTeams[assignment.ID_GRUPO]) {
                            updatedSelectedTeams[assignment.ID_GRUPO].push(assignment.ID_EQUIPO);
                        }
                    });
                    setSelectedTeams(updatedSelectedTeams);
                }

                // Fetch available teams for this competition
                console.log('Fetching available teams...');
                const { data: teamsData, error: teamsError } = await supabase
                    .rpc('teams_available_by_competition', { torneo: parseInt(competitionId, 10) });

                if (teamsError) throw teamsError;
                if (!isMounted) return;
                
                console.log('Available teams loaded:', teamsData);
                setTeams(teamsData || []);

            } catch (err) {
                console.error('Error fetching data:', err);
                if (isMounted) {
                    setError('Error al cargar los datos. Por favor intenta de nuevo.');
                }
            } finally {
                if (isMounted) {
                    console.log('Data fetch complete, setting loading to false');
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            console.log('Cleanup: unmounting component');
            isMounted = false;
        };
    }, [competitionId, selectedRoundId]);

    // Handle team selection with checkboxes
    const handleTeamSelect = (groupId: number, teamId: number, isChecked: boolean) => {
        setSelectedTeams(prev => {
            // Create a new state object
            const newState = { ...prev };
            
            // Initialize group array if it doesn't exist
            if (!newState[groupId]) {
                newState[groupId] = [];
            } else {
                // Create a new array reference to ensure React detects the change
                newState[groupId] = [...newState[groupId]];
            }
            
            // Add or remove team based on checkbox state
            const teamIndex = newState[groupId].indexOf(teamId);
            if (isChecked && teamIndex === -1) {
                newState[groupId].push(teamId);
            } else if (!isChecked && teamIndex !== -1) {
                newState[groupId].splice(teamIndex, 1);
            }
            
            return newState;
        });
    };

    // Test function for findPreviousRound (exposed for testing)
    const testFindPreviousRound = async () => {
        if (!competition || !selectedRoundId) {
            console.error('No competition or round selected');
            return;
        }

        console.log('=== Testing findPreviousRound function ===');
        console.log('Current competition ID:', competition.ID);
        console.log('Current competition name:', competition.NOMBRE);
        console.log('Current round ID:', selectedRoundId);

        try {
            // First, get all rounds for context
            const { data: allRounds } = await supabase
                .from('ronda')
                .select('ID, NOMBRE, ID_CAMPEONATO')
                .eq('ID_CAMPEONATO', competition.ID)
                .order('ID');
            
            console.log('All rounds in this competition:', allRounds);
            
            // Test the function
            const previousRound = await findPreviousRound(competition.ID, selectedRoundId);
            
            if (previousRound) {
                console.log('✅ Previous round found:', previousRound);
                console.log(`Details: ID: ${previousRound.ID}, Name: ${previousRound.NOMBRE}`);
            } else {
                console.log('ℹ️ No previous round found (this might be the first round)');
            }
        } catch (error) {
            console.error('❌ Error in findPreviousRound test:', error);
        }
    };

    // Function to get equipo_grupo ID for a team in a specific round using the custom SQL function
    const getEquipoGrupoId = async (teamId: number, roundId: number): Promise<number | null> => {
        try {
            const { data, error } = await supabase
                .rpc('get_team_prev_round', {
                    team: teamId,
                    round: roundId
                });

            if (error) throw error;
            
            // The function returns a table with an 'equipo' column containing the ID
            return data?.[0]?.equipo || null;
        } catch (error) {
            console.error('Error getting equipo_grupo ID:', error);
            return null;
        }
    };

    // Function to get roster for a team in a specific round
    const getTeamRoster = async (teamId: number, roundId: number) => {
        try {
            // First, get the equipo_grupo ID for this team and round
            const equipoGrupoId = await getEquipoGrupoId(teamId, roundId);
            if (!equipoGrupoId) {
                console.log(`No equipo_grupo found for team ${teamId} in round ${roundId}`);
                return [];
            }

            // Now get the roster for this equipo_grupo
            const { data: roster, error } = await supabase
                .from('plantel')
                .select(`
                    ID_JUGADORA,
                    NUMERO,
                    POSICION,
                    jugadora:ID_JUGADORA (PRIMER_NOMBRE, PRIMER_APELLIDO)
                `)
                .eq('ID_EQUIPO', equipoGrupoId);

            if (error) throw error;
            return roster || [];
        } catch (error) {
            console.error('Error getting team roster:', error);
            return [];
        }
    };

    // Helper function to create a temporary equipo_grupo for testing
    const createTemporaryEquipoGrupo = async (teamId: number, roundId: number): Promise<number | null> => {
        try {
            console.log(`Creating temporary equipo_grupo for team ${teamId} in round ${roundId}`);
            
            // First, find a group in this round
            const { data: groups, error: groupError } = await supabase
                .from('grupo')
                .select('ID')
                .eq('ID_RONDA', roundId)
                .limit(1);
                
            if (groupError || !groups || groups.length === 0) {
                console.error('No groups found in this round');
                return null;
            }
            
            const groupId = groups[0].ID;
            
            // Create the equipo_grupo entry
            const { data, error } = await supabase
                .from('equipo_grupo')
                .insert([
                    { 
                        ID_EQUIPO: teamId, 
                        ID_GRUPO: groupId,
                        // Other required fields with default values
                        PUNTOS: 0,
                        GOLES_FAVOR: 0,
                        GOLES_CONTRA: 0,
                        DIFERENCIA_GOL: 0,
                        PARTIDOS_JUGADOS: 0,
                        PARTIDOS_GANADOS: 0,
                        PARTIDOS_EMPATADOS: 0,
                        PARTIDOS_PERDIDOS: 0
                    }
                ])
                .select('ID')
                .single();
                
            if (error) throw error;
            
            console.log(`Created temporary equipo_grupo with ID: ${data.ID}`);
            return data.ID;
        } catch (error) {
            console.error('Error creating temporary equipo_grupo:', error);
            return null;
        }
    };

    // Function to copy roster for a team to the next round
    const copyTeamRosterToNextRound = async (teamId: number) => {
        if (!competition || !selectedRoundId) {
            console.error('No competition or round selected');
            return { success: false, message: 'No competition or round selected' };
        }

        console.log('=== Copying Roster to Next Round ===');
        console.log('Team ID:', teamId);
        console.log('Current round ID:', selectedRoundId);

        try {
            // Get previous round
            const previousRound = await findPreviousRound(competition.ID, selectedRoundId);
            if (!previousRound) {
                const message = 'No previous round found to copy from';
                console.log(message);
                return { success: false, message };
            }

            console.log(`Previous round: ${previousRound.NOMBRE} (ID: ${previousRound.ID})`);

            // Get equipo_grupo ID for previous round
            const previousEquipoGrupoId = await getEquipoGrupoId(teamId, previousRound.ID);
            if (!previousEquipoGrupoId) {
                const message = `No equipo_grupo found for team ${teamId} in previous round ${previousRound.ID}`;
                console.error(message);
                return { success: false, message };
            }

            // Get equipo_grupo ID for current round
            const currentEquipoGrupoId = await getEquipoGrupoId(teamId, selectedRoundId);
            if (!currentEquipoGrupoId) {
                const message = `No equipo_grupo found for team ${teamId} in current round ${selectedRoundId}`;
                console.error(message);
                return { success: false, message };
            }

            console.log(`Previous equipo_grupo ID: ${previousEquipoGrupoId}`);
            console.log(`Current equipo_grupo ID: ${currentEquipoGrupoId}`);
            
            // Get roster from previous round
            const previousRoster = await getTeamRoster(teamId, previousRound.ID);
            console.log(`\nPlayers in previous round (${previousRound.NOMBRE}):`, previousRoster);

            if (previousRoster.length === 0) {
                const message = 'No players found in the previous round - nothing to copy';
                console.warn(`⚠️ ${message}`);
                return { success: true, message, playersCopied: 0 };
            }

            // Prepare new roster entries
            const newRosterEntries = previousRoster.map(player => ({
                ID_JUGADORA: player.ID_JUGADORA,
                ID_EQUIPO: currentEquipoGrupoId, // Using current equipo_grupo ID
                NUMERO: player.NUMERO,
                POSICION: player.POSICION
            }));

            console.log(`\nInserting ${newRosterEntries.length} players into the new roster...`);
            
            // Insert the new roster entries
            const { data: insertedRoster, error: insertError } = await supabase
                .from('plantel')
                .insert(newRosterEntries)
                .select();

            if (insertError) {
                console.error('❌ Error inserting roster:', insertError);
                return { 
                    success: false, 
                    message: `Error inserting roster: ${insertError.message}`,
                    error: insertError 
                };
            }

            console.log('✅ Successfully copied roster to new round');
            return { 
                success: true, 
                message: `Successfully copied ${insertedRoster?.length || 0} players to the new round`,
                playersCopied: insertedRoster?.length || 0
            };
            
        } catch (error) {
            console.error('❌ Error in copyTeamRosterToNextRound:', error);
            return { 
                success: false, 
                message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error 
            };
        }
    };

    // Test function to show what roster data would be copied
    const testRosterCopy = async (teamId: number) => {
        const result = await copyTeamRosterToNextRound(teamId);
        console.log('Operation result:', result);
        return result;
    };

    // Expose test functions globally for testing
    useEffect(() => {
        // @ts-ignore - Adding to window for testing
        window.testFindPreviousRound = testFindPreviousRound;
        // @ts-ignore
        window.testRosterCopy = testRosterCopy;
        
        // Cleanup function to remove from window when component unmounts
        return () => {
            // @ts-ignore
            if (window.testFindPreviousRound) delete window.testFindPreviousRound;
            // @ts-ignore
            if (window.testRosterCopy) delete window.testRosterCopy;
        };
    }, [competition, selectedRoundId]);

    // Find the previous round in the competition
    const findPreviousRound = useCallback(async (competitionId: number, currentRoundId: number) => {
        try {
            // Get all rounds for this competition, ordered by ID
            const { data: rounds, error } = await supabase
                .from('ronda')
                .select('ID, NOMBRE')
                .eq('ID_CAMPEONATO', competitionId)
                .order('ID');

            if (error) throw error;
            if (!rounds || rounds.length === 0) return null;

            // Find the current round index
            const currentIndex = rounds.findIndex(r => r.ID === currentRoundId);
            
            // Return the previous round if it exists
            return currentIndex > 0 ? rounds[currentIndex - 1] : null;
        } catch (err) {
            console.error('Error finding previous round:', err);
            return null;
        }
    }, []);

    // Copy roster from one equipo_grupo to another
    const copyRoster = useCallback(async (fromEquipoGrupoId: number, toEquipoGrupoId: number, previousRoundId: number, currentRoundId: number) => {
        try {
            // Get the roster from the previous equipo_grupo
            const { data: roster, error: rosterError } = await supabase
                .from('plantel')
                .select('ID_JUGADORA, NUMERO, POSICION')
                .eq('ID_EQUIPO_GRUPO', fromEquipoGrupoId);

            if (rosterError) throw rosterError;
            if (!roster || roster.length === 0) {
                console.log(`No players found in equipo_grupo ${fromEquipoGrupoId}`);
                return;
            }

            // Prepare new roster entries with the new equipo_grupo ID
            const newRosterEntries = roster.map(player => ({
                ID_JUGADORA: player.ID_JUGADORA,
                ID_EQUIPO_GRUPO: toEquipoGrupoId,
                NUMERO: player.NUMERO,
                POSICION: player.POSICION
            }));

            console.log(`Preparing to copy ${newRosterEntries.length} players from equipo_grupo ${fromEquipoGrupoId} to ${toEquipoGrupoId}`);

            // Insert new roster entries
            const { error: insertError } = await supabase
                .from('plantel')
                .insert(newRosterEntries);

            if (insertError) throw insertError;

            console.log(`✅ Successfully copied ${newRosterEntries.length} players to equipo_grupo ${toEquipoGrupoId}`);
        } catch (err) {
            console.error('❌ Error copying roster:', err);
            throw err;
        }
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('handleSubmit called');
        
        if (!selectedRoundId) {
            console.log('No round selected');
            setError('Por favor selecciona una ronda');
            return;
        }

        try {
            console.log('Starting save operation');
            setIsLoading(true);
            setError('');
            setSuccess(false);

            // Get current assignments to determine what needs to be changed
            console.log('Fetching current team assignments...');
            
            // First get all groups for this round
            const { data: roundGroups, error: groupsError } = await supabase
                .from('grupo')
                .select('ID')
                .eq('ID_RONDA', selectedRoundId);
                
            if (groupsError) {
                console.error('Error fetching round groups:', groupsError);
                throw groupsError;
            }
            
            const groupIds = roundGroups.map(g => g.ID);
            
            // Then get all team assignments for these groups
            const { data: currentAssignments, error: fetchError } = groupIds.length > 0 
                ? await supabase
                    .from('equipo_grupo')
                    .select('ID_EQUIPO, ID_GRUPO')
                    .in('ID_GRUPO', groupIds)
                : { data: [], error: null };

            console.log('Current assignments:', currentAssignments);
            if (fetchError) {
                console.error('Error fetching current assignments:', fetchError);
                throw fetchError;
            }

            // Convert current assignments to a Map for easier lookup
            const currentAssignmentsMap = new Map<number, number>(); // teamId -> groupId
            currentAssignments?.forEach(assignment => {
                currentAssignmentsMap.set(assignment.ID_EQUIPO, assignment.ID_GRUPO);
            });

            // Track which assignments need to be added or removed
            const assignmentsToAdd: { ID_EQUIPO: number; ID_GRUPO: number }[] = [];
            const assignmentsToRemove: { ID_EQUIPO: number; ID_GRUPO: number }[] = [];
            const processedTeamIds = new Set<number>();

            // Check for new or updated assignments
            Object.entries(selectedTeams).forEach(([groupId, teamIds]) => {
                const groupIdNum = parseInt(groupId, 10);
                teamIds.forEach(teamId => {
                    processedTeamIds.add(teamId);
                    const currentGroupId = currentAssignmentsMap.get(teamId);
                    
                    // If the team wasn't assigned or was assigned to a different group
                    if (currentGroupId === undefined || currentGroupId !== groupIdNum) {
                        assignmentsToAdd.push({
                            ID_EQUIPO: teamId,
                            ID_GRUPO: groupIdNum
                        });
                        
                        // If the team was previously assigned to a different group, remove that assignment
                        if (currentGroupId !== undefined) {
                            assignmentsToRemove.push({
                                ID_EQUIPO: teamId,
                                ID_GRUPO: currentGroupId
                            });
                        }
                    }
                });
            });

            // Check for assignments that need to be removed (teams that were unassigned)
            currentAssignments?.forEach(assignment => {
                if (!processedTeamIds.has(assignment.ID_EQUIPO)) {
                    assignmentsToRemove.push({
                        ID_EQUIPO: assignment.ID_EQUIPO,
                        ID_GRUPO: assignment.ID_GRUPO
                    });
                }
            });

            // Process all changes
            console.log('Processing changes:', { 
                toRemove: assignmentsToRemove.length, 
                toAdd: assignmentsToAdd.length,
                currentRoundId: selectedRoundId
            });

            // After processing team assignments, handle roster updates if this is not the first round
            if (competition) {
                const previousRound = await findPreviousRound(competition.ID, selectedRoundId);
                
                if (previousRound) {
                    console.log(`Found previous round: ${previousRound.NOMBRE} (ID: ${previousRound.ID})`);
                    
                    // For each team that was just added, copy its roster from the previous round
                    for (const assignment of assignmentsToAdd) {
                        try {
                            await copyRoster(
                                assignment.ID_EQUIPO, 
                                assignment.ID_EQUIPO, // Same team, different round
                                previousRound.ID,
                                selectedRoundId
                            );
                        } catch (err) {
                            console.error(`Error copying roster for team ${assignment.ID_EQUIPO}:`, err);
                            // Continue with other teams even if one fails
                        }
                    }
                } else {
                    console.log('No previous round found or this is the first round');
                }
            }

            if (assignmentsToRemove.length > 0) {
                console.log('Starting to remove', assignmentsToRemove.length, 'assignments...');
                for (let i = 0; i < assignmentsToRemove.length; i++) {
                    const assignment = assignmentsToRemove[i];
                    console.log(`Removing assignment ${i+1}/${assignmentsToRemove.length}:`, assignment);
                    try {
                        const { error: deleteError } = await supabase
                            .from('equipo_grupo')
                            .delete()
                            .match({
                                ID_EQUIPO: assignment.ID_EQUIPO,
                                ID_GRUPO: assignment.ID_GRUPO
                            });

                        if (deleteError) {
                            console.error('Error removing assignment:', deleteError);
                            throw deleteError;
                        }
                        console.log(`Successfully removed assignment ${i+1}/${assignmentsToRemove.length}`);
                    } catch (err) {
                        console.error(`Error in deletion ${i+1}:`, err);
                        throw err;
                    }
                }
                console.log('Finished removing all assignments');
            } else {
                console.log('No assignments to remove');
            }

            if (assignmentsToAdd.length > 0) {
                console.log('Starting to add', assignmentsToAdd.length, 'new assignments...');
                try {
                    const { error: insertError } = await supabase
                        .from('equipo_grupo')
                        .insert(assignmentsToAdd);

                    if (insertError) {
                        console.error('Error adding assignments:', insertError);
                        throw insertError;
                    }
                    console.log('Successfully added all new assignments');
                } catch (err) {
                    console.error('Error in adding assignments:', err);
                    throw err;
                }
            } else {
                console.log('No new assignments to add');
            }
            
            console.log('Save operation completed successfully');
            setSuccess(true);
            
            // Navigate to match creator after a short delay to show success message
            setTimeout(() => {
                if (competitionId && selectedRoundId) {
                    navigate(`/competition/${competitionId}/build-matches?round=${selectedRoundId}`);
                } else if (competitionId) {
                    navigate(`/competition/${competitionId}`);
                }
            }, 1000);
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(`Error al guardar las asignaciones: ${errorMessage}. Por favor intenta de nuevo.`);
        } finally {
            console.log('Finalizing save operation...');
            if (isMounted.current) {
                console.log('Setting loading to false');
                setIsLoading(false);
                console.log('Loading state updated');
            } else {
                console.log('Component unmounted, not updating state');
            }
        }
    }, [selectedRoundId, selectedTeams]);

    if (!competitionId) {
        return (
            <div className="p-4 text-red-500">
                Error: No se ha especificado una competencia
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <form onSubmit={handleSubmit}>
                {/* Competition and Round Info */}
                <div className="mb-8">
                    {competition && (
                        <h1 className="text-2xl font-bold">
                            {competition.NOMBRE} - {competition.EDICION}
                        </h1>
                    )}
                    {round && (
                        <h2 className="text-xl font-semibold text-gray-700 mt-2">
                            Ronda: {round.NOMBRE}
                        </h2>
                    )}
                </div>
                
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                        ¡Asignaciones guardadas correctamente!
                    </div>
                )}
                
                {/* Groups and Team Selection */}
                {selectedRoundId && (
                    <div className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groups.map(group => (
                                <div key={group.ID} className="border rounded-lg p-4 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-medium text-lg">{group.NOMBRE}</h3>
                                        <span className="text-sm text-gray-500">
                                            {selectedTeams[group.ID]?.length || 0} / {group.EQUIPOS_CANT} equipos
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                        {teams.filter(team => team?.id).map(team => (
                                            <div key={`${group.ID}-${team.id}-${team.nombre || ''}`} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTeams[group.ID]?.includes(team.id) || false}
                                                    onChange={e => handleTeamSelect(group.ID, team.id, e.target.checked)}
                                                    className="mr-2"
                                                />
                                                <span>{team.nombre}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                disabled={isLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default TeamSelector;
