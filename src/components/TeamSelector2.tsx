import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Interfaces for our data models
interface Team {
    ID: number;
    NOMBRE: string;
}

interface Round {
    ID: number;
    NOMBRE: string;
}

interface Group {
    ID: number;
    NOMBRE: string;
    ID_RONDA: number;
    EQUIPOS_CANT: number;
}

interface TeamGroupAssignment {
    ID_GRUPO: number;
    ID_EQUIPO: number;
    ID_RONDA: number;
}

const TeamSelector: FC = () => {
    const { competitionId, roundId } = useParams<{ competitionId: string; roundId: string }>();
    const navigate = useNavigate();
    const isMounted = useRef(true);

    // State
    const [competition, setCompetition] = useState<{ ID: number; NOMBRE: string; EDICION: string } | null>(null);
    const [round, setRound] = useState<Round | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedTeams, setSelectedTeams] = useState<Record<number, number[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

    // Load data on component mount and when competitionId/roundId changes
    useEffect(() => {
        const loadData = async () => {
            if (!competitionId || !roundId) {
                setError('ID de competencia o ronda no proporcionado');
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError('');
            setSuccess('');
            setValidationErrors({});

            try {
                // 1. Load competition data
                const { data: competitionData, error: competitionError } = await supabase
                    .from('CAMPEONATO')
                    .select('ID, NOMBRE, EDICION')
                    .eq('ID', parseInt(competitionId, 10))
                    .single();

                if (competitionError) throw competitionError;
                if (!competitionData) throw new Error('Competition not found');
                
                setCompetition(competitionData);

                // 2. Load round data
                const { data: roundData, error: roundError } = await supabase
                    .from('RONDA')
                    .select('ID, NOMBRE')
                    .eq('ID', parseInt(roundId, 10))
                    .single();

                if (roundError) throw roundError;
                if (!roundData) throw new Error('Round not found');
                
                setRound(roundData);

                // 3. Load groups for this round
                const { data: groupsData, error: groupsError } = await supabase
                    .from('GRUPO')
                    .select('ID, NOMBRE, ID_RONDA, EQUIPOS_CANT')
                    .eq('ID_RONDA', parseInt(roundId, 10));

                if (groupsError) throw groupsError;
                setGroups(groupsData || []);

                // 4. Load teams for this competition
                const { data: teamsData, error: teamsError } = await supabase
                    .rpc('teams_available_by_competition', { 
                        torneo: parseInt(competitionId, 10)
                    });

                if (teamsError) throw teamsError;
                setTeams(teamsData || []);

                // 5. Load existing team assignments for these groups
                if (groupsData && groupsData.length > 0) {
                    const groupIds = groupsData.map(g => g.ID);
                    const { data: assignmentsData, error: assignmentsError } = await supabase
                        .from('EQUIPO_GRUPO')
                        .select('ID_GRUPO, ID_EQUIPO')
                        .in('ID_GRUPO', groupIds);

                    if (assignmentsError) throw assignmentsError;

                    // Initialize selectedTeams state
                    const initialSelectedTeams: Record<number, number[]> = {};
                    groupsData.forEach(group => {
                        const groupAssignments = (assignmentsData || [])
                            .filter((a: { ID_GRUPO: number; ID_EQUIPO: number | null }) => a.ID_GRUPO === group.ID && a.ID_EQUIPO !== null)
                            .map(a => a.ID_EQUIPO as number);
                        
                        initialSelectedTeams[group.ID] = groupAssignments || [];
                    });
                    
                    setSelectedTeams(initialSelectedTeams);
                }

            } catch (err) {
                console.error('Error loading data:', err);
                setError(err instanceof Error ? err.message : 'Error al cargar los datos');
            } finally {
                if (isMounted.current) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted.current = false;
        };
    }, [competitionId, roundId]);

    // Handle team selection
    const handleTeamSelect = (groupId: number, teamId: number, isSelected: boolean) => {
        setSelectedTeams(prev => {
            const newSelections = { ...prev };
            
            if (isSelected) {
                // Add team to group
                newSelections[groupId] = [...(newSelections[groupId] || []), teamId];
                
                // Remove team from other groups
                Object.keys(newSelections).forEach(gId => {
                    const groupIdNum = Number(gId);
                    if (groupIdNum !== groupId) {
                        newSelections[groupIdNum] = (newSelections[groupIdNum] || []).filter((id: number) => id !== teamId);
                    }
                });
            } else {
                // Remove team from group
                newSelections[groupId] = (newSelections[groupId] || []).filter((id: number) => id !== teamId);
            }
            
            return newSelections;
        });
    };

    // Validate team assignments
    const validateAssignments = (): boolean => {
        const errors: Record<number, string> = {};
        let isValid = true;

        groups.forEach(group => {
            const selectedCount = selectedTeams[group.ID]?.length || 0;
            
            if (selectedCount !== group.EQUIPOS_CANT) {
                errors[group.ID] = `Debe seleccionar exactamente ${group.EQUIPOS_CANT} equipos`;
                isValid = false;
            }
        });

        setValidationErrors(errors);
        return isValid;
    };

    // Handle form submission
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!roundId) {
            setError('No se ha especificado una ronda');
            return;
        }
        
        if (!validateAssignments()) {
            setError('Por favor corrija los errores antes de guardar');
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            setSuccess('');

            // Prepare team assignments
            const assignments: TeamGroupAssignment[] = [];
            
            Object.entries(selectedTeams).forEach(([groupId, teamIds]) => {
                (teamIds as number[]).forEach(teamId => {
                    assignments.push({
                        ID_GRUPO: Number(groupId),
                        ID_EQUIPO: teamId,
                        ID_RONDA: parseInt(roundId, 10)
                    });
                });
            });

            // Delete existing assignments for these groups
            const groupIds = groups.map(g => g.ID);
            const { error: deleteError } = await supabase
                .from('EQUIPO_GRUPO')
                .delete()
                .in('ID_GRUPO', groupIds);

            if (deleteError) throw deleteError;

            // Insert new assignments if there are any
            if (assignments.length > 0) {
                const { error: insertError } = await supabase
                    .from('EQUIPO_GRUPO')
                    .insert(assignments);

                if (insertError) throw insertError;
            }

            setSuccess('Asignaciones guardadas correctamente');
        } catch (err) {
            console.error('Error saving assignments:', err);
            setError('Error al guardar las asignaciones. Por favor intente de nuevo.');
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!competition || !round) {
        return (
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                No se encontraron datos de la competencia o ronda.
            </div>
        );
    }
                    .eq('ID', parseInt(competitionId, 10))
                    .single();

                if (compError) throw compError;
                if (compData) setCompetition(compData);

                // Load round data
                const { data: roundData, error: roundError } = await supabase
                    .from('RONDA')
                    .select('ID, NOMBRE')
                    .eq('ID', parseInt(roundId, 10))
                    .single();

                if (roundError) throw roundError;
                if (roundData) setRound(roundData);

                // Load groups for this round
                const { data: groupsData, error: groupsError } = await supabase
                    .from('GRUPO')
                    .select('ID, NOMBRE, ID_RONDA, EQUIPOS_CANT')
                    .eq('ID_RONDA', parseInt(roundId, 10));

                if (groupsError) throw groupsError;
                setGroups(groupsData || []);

                // Load available teams for this competition
                const { data: teamsData, error: teamsError } = await supabase
                    .rpc('teams_available_by_competition', { 
                        torneo: parseInt(competitionId, 10)
                    });

                if (teamsError) throw teamsError;
                setTeams(teamsData || []);

                // Initialize empty selections for each group
                const initialSelections: Record<number, number[]> = {};
                groupsData?.forEach(group => {
                    initialSelections[group.ID] = [];
                });
                setSelectedTeams(initialSelections);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Error al cargar los datos. Por favor intenta de nuevo.');
            } finally {
                if (isMounted.current) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted.current = false;
        };
    }, [competitionId, roundId]);

    // Handle team selection
    const handleTeamSelect = (groupId: number, teamId: number, isChecked: boolean) => {
        setSelectedTeams(prev => {
            const newSelections = { ...prev };
            
            if (isChecked) {
                // Add team to group
                newSelections[groupId] = [...(newSelections[groupId] || []), teamId];
                
                // Remove team from other groups
                Object.keys(newSelections).forEach(gId => {
                    const groupIdNum = Number(gId);
                    if (groupIdNum !== groupId) {
                        newSelections[groupIdNum] = newSelections[groupIdNum].filter(id => id !== teamId);
                    }
                });
            } else {
                // Remove team from group
                newSelections[groupId] = (newSelections[groupId] || []).filter(id => id !== teamId);
            }
            
            return newSelections;
        });
    };

    // Validate group assignments
    const validateAssignments = (): boolean => {
        const errors: Record<number, string> = {};
        let isValid = true;

        groups.forEach(group => {
            const selectedCount = selectedTeams[group.ID]?.length || 0;
            
            if (selectedCount !== group.EQUIPOS_CANT) {
                errors[group.ID] = `Debe seleccionar exactamente ${group.EQUIPOS_CANT} equipos`;
                isValid = false;
            }
        });

        setValidationErrors(errors);
        return isValid;
    };

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateAssignments()) {
            setError('Por favor corrija los errores antes de guardar');
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            setSuccess('');

            // Prepare team assignments
            const assignments: { equipo_id: number; grupo_id: number }[] = [];
            
            Object.entries(selectedTeams).forEach(([groupId, teamIds]) => {
                teamIds.forEach(teamId => {
                    assignments.push({
                        equipo_id: teamId,
                        grupo_id: Number(groupId)
                    });
                });
            });

            // Delete existing assignments for these groups
            const groupIds = groups.map(g => g.ID);
            const { error: deleteError } = await supabase
                .from('EQUIPO_GRUPO')
                .delete()
                .in('GRUPO_ID', groupIds);

            if (deleteError) throw deleteError;

            // Insert new assignments
            if (assignments.length > 0) {
                const { error: insertError } = await supabase
                    .from('EQUIPO_GRUPO')
                    .insert(assignments);

                if (insertError) throw insertError;
            }

            setSuccess('Asignaciones guardadas correctamente');
        } catch (err) {
            console.error('Error saving assignments:', err);
            setError('Error al guardar las asignaciones. Por favor intente de nuevo.');
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [selectedTeams, groups]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!competition || !round) {
        return (
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                No se encontraron datos de la competencia o ronda.
            </div>
        );
    }

    // If we don't have competition or round data, show loading or error
    if (!competition || !round) {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            );
        }
        
        return (
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                {error || 'No se encontraron datos de la competencia o ronda.'}
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-2">
                {competition.NOMBRE} - {competition.EDICION}
            </h1>
            <h2 className="text-xl font-semibold mb-6">Ronda: {round.NOMBRE}</h2>
            <h2 className="text-xl font-semibold mb-4">Ronda: {round.NOMBRE}</h2>
            
            {groups.length === 0 ? (
                <div className="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                    No hay grupos definidos para esta ronda.
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map(group => (
                            <div key={group.ID} className="border rounded-lg p-4 bg-white shadow">
                                <h3 className="font-bold text-lg mb-3">
                                    {group.NOMBRE} 
                                    <span className="text-sm font-normal text-gray-600 ml-2">
                                        (Seleccione {group.EQUIPOS_CANT} equipos)
                                    </span>
                                </h3>
                                
                                {validationErrors[group.ID] && (
                                    <div className="text-red-500 text-sm mb-2">
                                        {validationErrors[group.ID]}
                                    </div>
                                )}

                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {teams.filter(team => 
                                        // Only show teams that are either unassigned or assigned to this group
                                        !selectedTeams[group.ID]?.includes(team.ID) ||
                                        selectedTeams[group.ID]?.includes(team.ID)
                                    ).map(team => (
                                        <div key={`${group.ID}-${team.ID}`} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`team-${group.ID}-${team.ID}`}
                                                checked={selectedTeams[group.ID]?.includes(team.ID) || false}
                                                onChange={(e) => 
                                                    handleTeamSelect(group.ID, team.ID, e.target.checked)
                                                }
                                                className="h-4 w-4 text-blue-600 rounded"
                                                disabled={
                                                    // Disable if team is selected in another group
                                                    Object.entries(selectedTeams)
                                                        .filter(([gid]) => gid !== group.ID.toString())
                                                        .some(([_, teamIds]) => teamIds.includes(team.ID))
                                                }
                                            />
                                            <label 
                                                htmlFor={`team-${group.ID}-${team.ID}`}
                                                className="ml-2 text-sm text-gray-700"
                                            >
                                                {team.NOMBRE}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                        <div>
                            {error && (
                                <div className="text-red-500 text-sm">{error}</div>
                            )}
                            {success && (
                                <div className="text-green-600 text-sm">{success}</div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Guardando...' : 'Guardar Asignaciones'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

            } catch (err) {
                console.error('Error loading data:', err);
                setError('Error al cargar los datos. Por favor intenta de nuevo.');
            } finally {
                if (isMounted.current) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted.current = false;
        };
    }, [competitionId, selectedRoundId, searchParams, setSearchParams]);

    // Handle team selection
    const handleTeamSelect = useCallback((groupId: number, teamId: number | null) => {
        setSelectedTeams(prev => ({
            ...prev,
            [groupId]: teamId
        }));
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedRoundId) {
            setError('Por favor selecciona una ronda');
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            setSuccess(false);

            // Start a transaction
            await supabase.rpc('begin');

            // Delete existing assignments for this round
            const { error: deleteError } = await supabase
                .from('equipo_grupo')
                .delete()
                .eq('ronda_id', selectedRoundId);

            if (deleteError) throw deleteError;

            // Insert new assignments
            const assignments = Object.entries(selectedTeams)
                .filter(([_, teamId]) => teamId !== null)
                .map(([groupId, teamId]) => ({
                    equipo_id: teamId,
                    grupo_id: parseInt(groupId, 10),
                    ronda_id: selectedRoundId,
                }));

            if (assignments.length > 0) {
                const { error: insertError } = await supabase
                    .from('equipo_grupo')
                    .insert(assignments);

                if (insertError) throw insertError;
            }

            // Commit the transaction
            await supabase.rpc('commit');
            
            setSuccess(true);
        } catch (err) {
            // Rollback on error
            await supabase.rpc('rollback');
            setError('Error al guardar las asignaciones');
            console.error('Error saving assignments:', err);
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
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
            <h1 className="text-2xl font-bold mb-6">Asignación de Equipos</h1>
            
            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                    {success}
                </div>
            )}
            
            {/* Groups and Team Selection */}
            {selectedRoundId && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Grupos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map(group => (
                            <div key={group.id} className="border rounded-lg p-4 shadow-sm">
                                <h3 className="font-medium text-lg mb-3">{group.nombre}</h3>
                                <select
                                    value={selectedTeams[group.id] || ''}
                                    onChange={(e) => handleTeamSelect(
                                        group.id, 
                                        e.target.value ? parseInt(e.target.value, 10) : null
                                    )}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    disabled={isLoading}
                                >
                                    <option key="team-default" value="">Seleccione un equipo</option>
                                    {teams && teams.map(team => (
                                        <option key={`team-${team.id}`} value={team.id}>
                                            {team.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                    
                    {/* Submit Button */}
                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                                isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                            {isLoading ? 'Guardando...' : 'Guardar asignaciones'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamSelector;
