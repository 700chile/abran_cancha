import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Group, Match, Gameday } from '../types/match';

// Type for the team data returned by get_teams_by_group function
// Type for the group data from Supabase
type SupabaseTeam = {
  ID: number;
  NOMBRE: string;
};

type SupabaseEquipoGrupo = {
  equipo: SupabaseTeam;
};

type SupabaseGroup = {
  ID: number;
  NOMBRE: string;
  ID_RONDA: number;
  TIPO: string;
  VUELTAS: 'UNA VUELTA' | 'IDA Y VUELTA' | 'FINAL UNICA';
  EQUIPOS_CANT: number;
  equipos?: SupabaseEquipoGrupo[];
};

// Helper functions for match generation
const generateRoundRobinMatches = (group: Group, isSecondLeg: boolean = false): Gameday[] => {
  const { teams, teamsCount, id: groupId, competitionId, roundId } = group;
  const isOdd = teamsCount % 2 !== 0;
  
  // For odd team counts, add a BYE to make the list even and use the effective team count.
  let teamList = [...teams];
  if (isOdd) {
    teamList = [...teamList, { id: 'dummy', name: 'BYE' }];
  }

  const effectiveTeams = teamList.length; // even number
  const totalGamedays = effectiveTeams - 1; // n-1 rounds with BYE included
  const matchesPerGameday = effectiveTeams / 2; // n/2 pairs (one will include BYE when odd)

  const gamedays: Gameday[] = [];

  // Generate gamedays using the circle method (first fixed, rotate the rest)
  for (let round = 0; round < totalGamedays; round++) {
    const gamedayNumber = round + 1 + (isSecondLeg ? totalGamedays : 0);
    const gamedayName = totalGamedays <= 9
      ? `Jornada ${gamedayNumber}`
      : `Jornada ${gamedayNumber.toString().padStart(2, '0')}`;

    const matches: Match[] = [];

    for (let i = 0; i < matchesPerGameday; i++) {
      const homeIndex = i;
      const awayIndex = teamList.length - 1 - i;

      const home = teamList[homeIndex];
      const away = teamList[awayIndex];

      // Skip BYE pair
      if (home.id === 'dummy' || away.id === 'dummy') {
        continue;
      }

      const [homeTeam, awayTeam] = isSecondLeg ? [away, home] : [home, away];

      matches.push({
        fecha: gamedayNumber,
        programacion: '',
        eq_local: homeTeam.id,
        eq_visita: awayTeam.id,
        id_competencia: competitionId,
        id_grupo: groupId,
        id_ronda: roundId,
        ronda: gamedayName,
      });
    }

    gamedays.push({
      id: `${groupId}-${gamedayNumber}`,
      name: gamedayName,
      date: '',
      matches,
      groupId,
      isFirstLeg: !isSecondLeg,
    });

    // Perform rotation: keep first fixed, rotate the rest one step to the right
    if (teamList.length > 2) {
      const fixed = teamList[0];
      const rest = teamList.slice(1);
      const last = rest.pop();
      if (last) rest.unshift(last);
      teamList = [fixed, ...rest];
    }
  }

  return gamedays;
};

const generateEliminationMatches = (group: Group): Gameday[] => {
  const { teamsCount, type, legs, id: groupId, competitionId, roundId } = group;
  const totalRounds = Math.ceil(Math.log2(teamsCount));
  // Log the raw legs value and its type for debugging
  console.log(`\n[generateEliminationMatches] Group: ${group.name}`);
  console.log(`Teams: ${teamsCount}, Type: ${type}`);
  console.log(`Raw legs value: '${legs}', type: ${typeof legs}`);
  
  // Determine match type flags based on legs value
  const isTwoLegs = legs === 'IDA Y VUELTA';
  const isFinalUnique = legs === 'FINAL UNICA';
  const isOneLeg = legs === 'UNA VUELTA';
  
  console.log(`Match type flags - isTwoLegs: ${isTwoLegs}, isFinalUnique: ${isFinalUnique}, isOneLeg: ${isOneLeg}`);
  console.log(`Total rounds: ${totalRounds}`);
  
  const roundNames = [
    'FINAL',
    'SEMIFINALES',
    'CUARTOS DE FINAL',
    'OCTAVOS DE FINAL',
    'RONDA DE 16',
    'RONDA DE 32',
    'RONDA DE 64',
  ];
  
  const gamedays: Gameday[] = [];
  let gamedayNumber = 1;
  
  // Generate matches from final to first round
  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, round);
    const roundName = roundNames[round] || `Ronda ${matchesInRound * 2}`;
    
    // Determine how many legs to generate
    let legsToGenerate = 1; // Default to single leg
    
    if (isTwoLegs) {
      // IDA Y VUELTA - always 2 legs for all rounds
      legsToGenerate = 2;
    } else if (isFinalUnique) {
      // FINAL UNICA - 1 leg for final, 2 legs for other rounds
      legsToGenerate = round === 0 ? 1 : 2;
    }
    // UNA VUELTA - always 1 leg (default)
    
    console.log(`\n[generateEliminationMatches] Round ${round + 1}/${totalRounds}: ${roundName}`);
    console.log(`Matches in round: ${matchesInRound}, Legs to generate: ${legsToGenerate}`);
    console.log(`Current legs state: isTwoLegs=${isTwoLegs}, isFinalUnique=${isFinalUnique}`);
    
    for (let leg = 0; leg < legsToGenerate; leg++) {
      const isSecondLeg = leg === 1;
      const legSuffix = isSecondLeg ? 'VUELTA' : 'IDA';
      
      console.log(`\n[generateEliminationMatches] Leg ${leg + 1}/${legsToGenerate}`);
      console.log(`isSecondLeg: ${isSecondLeg}, legSuffix: '${legSuffix}'`);
      
      // Determine if we should add leg suffix (IDA/VUELTA) to the round name
      let shouldAddLegSuffix = false;
      
      if (isTwoLegs) {
        // IDA Y VUELTA - always add suffix
        console.log('Tournament type: IDA Y VUELTA - Adding leg suffix to all rounds');
        shouldAddLegSuffix = true;
      } else if (isFinalUnique) {
        // FINAL UNICA - only add to non-final rounds
        shouldAddLegSuffix = round > 0;
        console.log(`Tournament type: FINAL UNICA - ${shouldAddLegSuffix ? 'Adding' : 'Skipping'} leg suffix for ${round === 0 ? 'final' : 'non-final'} round`);
      } else {
        // UNA VUELTA - never add suffix
        console.log('Tournament type: UNA VUELTA - Not adding leg suffix');
      }
      
      const gamedayName = shouldAddLegSuffix 
        ? `${roundName} ${legSuffix}`.trim()
        : roundName;
        
      console.log(`Generated gameday name: '${gamedayName}'`);
        
      console.log(`\n[generateEliminationMatches] Leg ${leg + 1}/${legsToGenerate}`);
      console.log(`isSecondLeg: ${isSecondLeg}, legSuffix: '${legSuffix}'`);
      console.log(`shouldAddLegSuffix: ${shouldAddLegSuffix}, gamedayName: '${gamedayName}'`);
      console.log(`Round type: ${round === 0 ? 'Final' : round === 1 ? 'Semi-final' : 'Earlier round'}`);
      
      const matches: Match[] = [];
      
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          fecha: gamedayNumber,
          programacion: '',
          eq_local: null,
          eq_visita: null,
          id_competencia: competitionId,
          id_grupo: groupId,
          id_ronda: roundId,
          ronda: gamedayName,
        });
      }
      
      gamedays.push({
        id: `${groupId}-${gamedayNumber}`,
        name: gamedayName,
        date: '',
        matches,
        groupId,
        isFirstLeg: !isSecondLeg,
      });
      
      gamedayNumber++;
    }
  }
  
  return gamedays;
};

// Main component
const MatchCreator: React.FC = () => {
  // Get all route parameters and query parameters
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Log all available information for debugging
  useEffect(() => {
    console.log('=== Debugging Route Parameters ===');
    console.log('Full URL:', window.location.href);
    console.log('Path segments:', window.location.pathname.split('/'));
    console.log('All route params:', params);
    console.log('All query params:', Object.fromEntries(searchParams.entries()));
  }, [params, searchParams]);
  
  // Get the competition ID from the first path segment after 'competition'
  const pathSegments = window.location.pathname.split('/');
  const competitionId = pathSegments[pathSegments.indexOf('competition') + 1];
  const roundId = searchParams.get('round');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<{ [key: number]: boolean }>({});
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [firstRoundId, setFirstRoundId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [matchday, setMatchday] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState<boolean>(false);

  console.log('Extracted values:', { competitionId, roundId });
  }, [competitionId, roundId]);
  
  // Fetch competition and round data
  useEffect(() => {
    const fetchData = async () => {
      console.log('Starting to fetch data...');
      if (!competitionId || !roundId) {
        console.log('Missing competitionId or roundId', { competitionId, roundId });
        return;
      }
      
      try {
        console.log('Setting loading to true');
        setIsLoading(true);
        
        // Fetch competition name
        console.log('Fetching competition data for ID:', competitionId);
        const { data: competitionData, error: competitionError } = await supabase
          .from('campeonato')
          .select('NOMBRE')
          .eq('ID', competitionId)
          .single<{ NOMBRE: string }>();
          
        if (competitionError) {
          console.error('Error fetching competition:', competitionError);
          throw competitionError;
        }
        console.log('Competition data:', competitionData);
        if (competitionData) {
          setCompetitionName(competitionData.NOMBRE);
        }
        
        // Fetch round name
        console.log('Fetching round data for ID:', roundId);
        const { data: roundData, error: roundError } = await supabase
          .from('ronda')
          .select('NOMBRE')
          .eq('ID', roundId)
          .single<{ NOMBRE: string }>();
          
        if (roundError) {
          console.error('Error fetching round:', roundError);
          throw roundError;
        }
        console.log('Round data:', roundData);
        if (roundData) {
          setRoundName(roundData.NOMBRE);
        }
        
        // First, fetch groups for this round
        console.log('Fetching groups for round ID:', roundId);
        const { data: groupsData, error: groupsError } = await supabase
          .from('grupo')
          .select('*')
          .eq('ID_RONDA', roundId);
          
        if (groupsError) {
          console.error('Error fetching groups:', groupsError);
          throw groupsError;
        }
        
        // Log the raw groups data
        console.log('Raw groups data from Supabase:');
        console.log(JSON.stringify(groupsData, null, 2));
        
        // Log the structure of the first group's equipos
        if (groupsData && groupsData.length > 0) {
          console.log('Structure of first group\'s equipos:', groupsData[0].equipos);
          if (groupsData[0].equipos && groupsData[0].equipos.length > 0) {
            console.log('First equipo structure:', groupsData[0].equipos[0]);
          }
        }
        
        // Then fetch teams for each group using the stored function
        if (groupsData && groupsData.length > 0) {
          console.log('Fetching teams for each group...');
          
          // Process each group to fetch its teams
          const groupsWithTeams = await Promise.all(groupsData.map(async (group) => {
            console.log(`Fetching teams for group ${group.ID} (${group.NOMBRE})`);
            
            try {
              // Call the stored function to get teams for this group
              const { data: teamsData, error: teamsError } = await supabase
                .rpc('get_teams_by_group', { group_id: group.ID });
                
              if (teamsError) throw teamsError;
              
              console.log(`Teams for group ${group.ID}:`, teamsData);
              
              // Transform the teams data to match our expected structure
              // Note: The RPC returns lowercase property names (id, nombre)
              const equipos = Array.isArray(teamsData) 
                ? teamsData.map(team => ({
                    equipo: {
                      ID: team.id,  // Use lowercase id
                      NOMBRE: team.nombre  // Use lowercase nombre
                    }
                  }))
                : [];
              
              return {
                ...group,
                equipos
              };
              
            } catch (error) {
              console.error(`Error fetching teams for group ${group.ID}:`, error);
              return {
                ...group,
                equipos: []
              };
            }
          }));
          
          // Log the final data structure
          console.log('Groups with teams:', groupsWithTeams);
          
          // Update the groups data with the fetched teams
          groupsData.splice(0, groupsData.length, ...groupsWithTeams);
        }
        if (groupsData) {
          // Debug log for VUELTAS
          console.log('Group data with VUELTAS:', groupsData.map(g => ({
            id: g.ID,
            name: g.NOMBRE,
            VUELTAS: g.VUELTAS,
            VUELTAS_type: typeof g.VUELTAS
          })));
          
          const formattedGroups: Group[] = groupsData.map((group: SupabaseGroup) => {
            return {
              id: group.ID.toString(),
              name: group.NOMBRE,
              type: group.TIPO as 'TODOS CONTRA TODOS' | 'ELIMINACION DIRECTA',
              // VUELTAS is already a string with the correct value ('UNA VUELTA' or 'IDA Y VUELTA')
              legs: group.VUELTAS as 'UNA VUELTA' | 'IDA Y VUELTA' | 'FINAL UNICA',
              teams: (group.equipos || []).map(eg => ({
                id: eg.equipo.ID.toString(),
                name: eg.equipo.NOMBRE
              })),
              teamsCount: group.EQUIPOS_CANT,
              competitionId: competitionId || '',
              roundId: roundId || ''
            };
          });
          
          setGroups(formattedGroups);
          
          // Generate gamedays for each group
          const allGamedays: Gameday[] = [];
          
          for (const group of formattedGroups) {
            console.log(`\n=== Generating matches for group: ${group.name} ===`);
            console.log(`Type: ${group.type}, Legs: ${group.legs}, Teams: ${group.teams.length}`);
            
            let groupGamedays: Gameday[] = [];
            
            if (group.type === 'TODOS CONTRA TODOS') {
              console.log('Generating Round Robin matches...');
              // Round Robin
              groupGamedays = generateRoundRobinMatches(group);
              
              if (group.legs === 'IDA Y VUELTA') {
                console.log('Adding second leg for Round Robin...');
                groupGamedays = [
                  ...groupGamedays,
                  ...generateRoundRobinMatches(group, true)
                ];
              }
            } else {
              console.log('Generating Elimination matches...');
              // Elimination
              groupGamedays = generateEliminationMatches(group);
              console.log('Generated elimination gamedays:', groupGamedays.map(g => ({
                name: g.name,
                matches: g.matches.length,
                isFirstLeg: g.isFirstLeg
              })));
            }
            
            allGamedays.push(...groupGamedays);
          }
          
          setGamedays(allGamedays);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        // Make sure to set loading to false even on error
        setIsLoading(false);
      } finally {
        console.log('Finished loading data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [competitionId, roundId]);
  
  // Handle date change for a gameday
  const handleDateChange = (gamedayId: string, date: string) => {
    setGamedays(prev => 
      prev.map(gameday => 
        gameday.id === gamedayId 
          ? { 
              ...gameday, 
              date, 
              matches: gameday.matches.map(match => ({
                ...match, 
                programacion: date
              }))
            } 
          : gameday
      )
    );
  };
  
  // Handle team selection change
  const handleTeamChange = (
    gamedayId: string, 
    matchIndex: number, 
    field: 'EQ_LOCAL' | 'EQ_VISITA', 
    value: string | null
  ) => {
    setGamedays(prev => 
      prev.map(gameday => 
        gameday.id === gamedayId
          ? {
              ...gameday,
              matches: gameday.matches.map((match, idx) => 
                idx === matchIndex 
                  ? { 
                      ...match, 
                      // Update both uppercase (for DB) and lowercase (for internal state)
                      [field]: value,
                      ...(field === 'EQ_LOCAL' 
                        ? { eq_local: value }
                        : { eq_visita: value })
                    } 
                  : match
              )
            }
          : gameday
      )
    );
  };
  
  // Validate team assignments for all groups
  const validateTeamAssignments = useCallback((): boolean => {
    const errors: {groupId: string; message: string}[] = [];
    
    groups.forEach(group => {
      const assignedTeams = group.teams.length;
      const requiredTeams = group.teamsCount;
      
      if (assignedTeams < requiredTeams) {
        errors.push({
          groupId: group.id,
          message: `El grupo ${group.name} requiere ${requiredTeams} equipos, pero solo tiene ${assignedTeams} asignados.`
        });
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [groups]);

  // Validate team assignments when groups change
  useEffect(() => {
    if (groups.length > 0) {
      validateTeamAssignments();
    }
  }, [groups, validateTeamAssignments]);

  // Navigate to TeamSelector for a specific group
  const navigateToTeamSelector = (groupId: string) => {
    if (!competitionId || !roundId) return;
    
    // Using the correct route format that matches App.tsx routing
    navigate(`/competition/${competitionId}/round/${roundId}/select-teams?group=${groupId}`);
  };

  // Save matches to database
  const saveMatches = async () => {
    // First validate team assignments
    if (!validateTeamAssignments()) {
      // If there are validation errors, don't proceed with saving
      return;
    }
    try {
      setIsLoading(true);
      console.log('Starting to save matches...');
      
      // First, check if we can connect to Supabase
      const { error: testError } = await supabase
        .from('partido')
        .select('ID')
        .limit(1);
      
      if (testError) {
        console.error('Error connecting to Supabase:', testError);
        throw new Error(`No se pudo conectar a la base de datos: ${testError.message}`);
      }
      
      // Flatten all matches from all gamedays
      const allMatches: any[] = [];
      const errors: string[] = [];
      
      gamedays.forEach((gameday, gIdx) => {
        gameday.matches.forEach((match, mIdx) => {
          // Only attempt to save matches that have a date assigned
          if (!match.programacion) {
            // Skip undated matches (e.g., future rounds like semifinal/final not yet scheduled)
            return;
          }
          
          if (!match.id_grupo || !match.id_competencia || !match.id_ronda) {
            errors.push(`El partido ${gIdx + 1}-${mIdx + 1} no tiene todos los campos requeridos`);
            return;
          }
          
          // Create a new object with only the required fields for the partido table
          const matchToSave = {
            // Only include these specific fields as per requirements
            EQ_LOCAL: match.eq_local ? String(match.eq_local) : null,
            EQ_VISITA: match.eq_visita ? String(match.eq_visita) : null,
            PROGRAMACION: new Date(match.programacion).toISOString(),
            // Use the gameday name (ronda) in the FECHA field
            FECHA: match.ronda || 'SIN NOMBRE',
            
            // Include ID if it exists (for updates)
            ...(match.id && { ID: match.id })
          };
          
          console.log(`Preparing match ${gIdx + 1}-${mIdx + 1}:`, matchToSave);
          allMatches.push(matchToSave);
        });
      });
      
      if (errors.length > 0) {
        console.error('Validation errors:', errors);
        alert(`Errores de validación:\n${errors.join('\n')}`);
        return;
      }
      
      if (allMatches.length === 0) {
        const message = 'No hay partidos válidos para guardar. Asegúrese de que al menos un partido tenga una fecha programada.';
        console.error(message);
        alert(message);
        return;
      }
      
      console.log(`Preparing to save ${allMatches.length} matches in batches...`);
      
      // Insert matches one by one to better identify any issues
      const savedMatches = [];
      const failedMatches = [];
      
      for (let i = 0; i < allMatches.length; i++) {
        const match = allMatches[i];
        console.log(`Saving match ${i + 1}/${allMatches.length}:`, match);
        
        try {
          const { error } = await supabase
            .from('partido')
            .upsert(match, { onConflict: 'ID' });
            
          if (error) {
            console.error(`Error saving match ${i + 1}:`, error);
            failedMatches.push({
              match,
              error: error.message || 'Error desconocido'
            });
          } else {
            console.log(`Match ${i + 1} saved successfully`);
            savedMatches.push(match);
          }
        } catch (error) {
          console.error(`Unexpected error saving match ${i + 1}:`, error);
          failedMatches.push({
            match,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      
      if (failedMatches.length > 0) {
        console.error('Failed to save some matches:', failedMatches);
        throw new Error(
          `Se guardaron ${savedMatches.length} de ${allMatches.length} partidos. ` +
          `No se pudieron guardar ${failedMatches.length} partidos. ` +
          'Por favor revise la consola para más detalles.'
        );
      }
      
      const successMessage = `¡Éxito! Se guardaron ${savedMatches.length} partidos correctamente.`;
      console.log(successMessage);
      alert(successMessage);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? `Error al guardar los partidos: ${error.message}`
        : 'Error desconocido al guardar los partidos';
      
      console.error('Error saving matches:', {
        error,
        errorString: String(error),
        errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error || {})),
        timestamp: new Date().toISOString()
      });
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-xl">Cargando...</div>
    </div>;
  }
  
  // Check if there are any validation errors
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {competitionName} - {roundName}
      </h1>

      {/* Validation Error Banner */}
      {hasValidationErrors && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Hay problemas con la asignación de equipos
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-center">
                      <span>{error.message}</span>
                      <button
                        onClick={() => navigateToTeamSelector(error.groupId)}
                        className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Asignar equipos
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {groups.map(group => (
        <div key={group.id} className="mb-8 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">Grupo: {group.name}</h2>
          
          {gamedays
            .filter(g => g.groupId === group.id)
            .map(gameday => (
              <div key={gameday.id} className="mb-6 p-4 bg-gray-50 rounded">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-medium">{gameday.name}</h3>
                  <input
                    type="date"
                    value={gameday.date}
                    onChange={(e) => handleDateChange(gameday.id, e.target.value)}
                    className="ml-4 p-1 border rounded"
                  />
                </div>
                
                <div className="space-y-2">
                  {gameday.matches.map((match, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select
                        value={match.EQ_LOCAL || ''}
                        onChange={(e) => 
                          handleTeamChange(
                            gameday.id, 
                            idx, 
                            'EQ_LOCAL', 
                            e.target.value || null
                          )
                        }
                        className="p-2 border rounded flex-1"
                        disabled={!gameday.date}
                      >
                        <option value="">Seleccionar equipo local</option>
                        {group.teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      
                      <span>vs</span>
                      
                      <select
                        value={match.EQ_VISITA || ''}
                        onChange={(e) => 
                          handleTeamChange(
                            gameday.id, 
                            idx, 
                            'EQ_VISITA', 
                            e.target.value || null
                          )
                        }
                        className="p-2 border rounded flex-1"
                        disabled={!gameday.date}
                      >
                        <option value="">Seleccionar equipo visita</option>
                        {group.teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ))}
      
      <div className="mt-6">
        <button
          onClick={saveMatches}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Guardando...' : 'Guardar Partidos'}
        </button>
      </div>
    </div>
  );
};

export default MatchCreator;
