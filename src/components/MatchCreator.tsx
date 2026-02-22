import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Message = { type: 'success' | 'error'; text: string };

interface Competition {
  ID: number;
  NOMBRE: string;
  EDICION: string;
}

interface Round {
  ID: number;
  NOMBRE: string;
}

interface Group {
  ID: number;
  NOMBRE: string;
  ID_RONDA: number;
  EQUIPOS_CANT?: number | null;
  VUELTAS?: string | null;
  TIPO?: string | null;
}

interface Team {
  id: number;
  nombre: string;
}

interface MatchAssignment {
  group_id: number;
  matchday: number;
  home_team: number;
  away_team: number;
}

type FixturesByGroup = Record<number, MatchAssignment[]>;

const normalizeVueltas = (vueltas?: string | null): 'UNA VUELTA' | 'IDA Y VUELTA' | 'FINAL UNICA' | 'UNKNOWN' => {
  if (!vueltas) return 'UNKNOWN';
  const v = vueltas.toUpperCase();
  if (v === 'UNA VUELTA') return 'UNA VUELTA';
  if (v === 'IDA Y VUELTA') return 'IDA Y VUELTA';
  if (v === 'FINAL UNICA' || v === 'FINAL ÚNICA') return 'FINAL UNICA';
  return 'UNKNOWN';
};

const generateRoundRobinFixtures = (teamIds: number[], vueltas: ReturnType<typeof normalizeVueltas>, groupId: number): MatchAssignment[] => {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  let working: Array<number | null> = [...ids];
  if (working.length % 2 === 1) working.push(null);

  const n = working.length;
  const rounds = n - 1;
  const half = n / 2;

  const singleLeg: MatchAssignment[] = [];
  for (let r = 0; r < rounds; r++) {
    const matchday = r + 1;
    for (let i = 0; i < half; i++) {
      const a = working[i];
      const b = working[n - 1 - i];
      if (a == null || b == null) continue;

      const isEvenRound = r % 2 === 0;
      const home = isEvenRound ? a : b;
      const away = isEvenRound ? b : a;

      singleLeg.push({
        group_id: groupId,
        matchday,
        home_team: home,
        away_team: away,
      });
    }

    const fixed = working[0];
    const rest = working.slice(1);
    rest.unshift(rest.pop() ?? null);
    working = [fixed, ...rest];
  }

  if (vueltas !== 'IDA Y VUELTA') return singleLeg;

  const secondLeg = singleLeg.map((m) => ({
    ...m,
    matchday: m.matchday + rounds,
    home_team: m.away_team,
    away_team: m.home_team,
  }));

  return [...singleLeg, ...secondLeg];
};

export default function MatchCreator() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const roundIdParam = searchParams.get('round');

  const competitionId = id ? Number(id) : null;
  const roundId = roundIdParam ? Number(roundIdParam) : null;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamIdsByGroup, setTeamIdsByGroup] = useState<Record<number, number[]>>({});

  const [fixturesByGroup, setFixturesByGroup] = useState<FixturesByGroup>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const teamsById = useMemo(() => {
    const m = new Map<number, Team>();
    teams.forEach((t) => m.set(t.id, t));
    return m;
  }, [teams]);

  const maxMatchday = useMemo(() => {
    let max = 0;
    Object.values(fixturesByGroup).forEach((arr) => {
      arr.forEach((m) => {
        if (m.matchday > max) max = m.matchday;
      });
    });
    return max;
  }, [fixturesByGroup]);

  const allAssignments = useMemo(() => Object.values(fixturesByGroup).flat(), [fixturesByGroup]);

  useEffect(() => {
    const load = async () => {
      if (!competitionId || !roundId) return;
      setIsLoading(true);
      setMessage(null);

      try {
        const { data: competitionData, error: compError } = await supabase
          .from('campeonato')
          .select('ID, NOMBRE, EDICION')
          .eq('ID', competitionId)
          .single();

        if (compError) throw compError;
        setCompetition(competitionData);

        const { data: roundData, error: roundError } = await supabase
          .from('ronda')
          .select('ID, NOMBRE')
          .eq('ID', roundId)
          .single();

        if (roundError) throw roundError;
        setRound(roundData);

        const { data: groupsData, error: groupsError } = await supabase
          .from('grupo')
          .select('ID, NOMBRE, ID_RONDA, EQUIPOS_CANT, VUELTAS, TIPO')
          .eq('ID_RONDA', roundId)
          .order('ID');

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        const { data: teamsData, error: teamsError } = await supabase
          .rpc('teams_available_by_competition', { torneo: competitionId });

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        const groupIds = (groupsData || []).map((g) => g.ID);
        const { data: assignmentsData, error: assignmentsError } = groupIds.length
          ? await supabase
              .from('equipo_grupo')
              .select('ID_GRUPO, ID_EQUIPO')
              .in('ID_GRUPO', groupIds)
          : { data: [], error: null };

        if (assignmentsError) throw assignmentsError;

        const byGroup: Record<number, number[]> = {};
        groupIds.forEach((gid) => (byGroup[gid] = []));
        (assignmentsData || []).forEach((a: any) => {
          if (!byGroup[a.ID_GRUPO]) byGroup[a.ID_GRUPO] = [];
          byGroup[a.ID_GRUPO].push(a.ID_EQUIPO);
        });
        Object.keys(byGroup).forEach((gid) => byGroup[Number(gid)].sort((x, y) => x - y));
        setTeamIdsByGroup(byGroup);

        setFixturesByGroup({});
      } catch (e: any) {
        console.error('Error loading match creator data:', e);
        const text = e?.message ? `Error: ${e.message}` : 'Error al cargar los datos.';
        setMessage({ type: 'error', text });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [competitionId, roundId]);

  const handleGenerate = useCallback(() => {
    setMessage(null);
    if (!round) {
      setMessage({ type: 'error', text: 'Error: no se encontró la ronda.' });
      return;
    }

    // Check if all groups have valid VUELTAS and TIPO
    for (const group of groups) {
      const vueltas = normalizeVueltas(group.VUELTAS);
      const tipo = (group.TIPO || '').trim();
      
      // Only accept the two exact TIPO values
      if (tipo && tipo !== 'TODOS CONTRA TODOS' && tipo !== 'ELIMINACION DIRECTA') {
        setMessage({ type: 'error', text: `El grupo "${group.NOMBRE}" tiene un tipo no válido (TIPO=${group.TIPO ?? 'N/A'}). Valores permitidos: "TODOS CONTRA TODOS" o "ELIMINACION DIRECTA".` });
        return;
      }

      // For elimination brackets, we need special handling
      if (tipo === 'ELIMINACION DIRECTA') {
        setMessage({ type: 'error', text: `El grupo "${group.NOMBRE}" es de eliminación directa. Esta funcionalidad no está implementada aún. Solo se soporta "TODOS CONTRA TODOS".` });
        return;
      }

      if (vueltas === 'UNKNOWN') {
        setMessage({ type: 'error', text: `No se reconoce VUELTAS=${group.VUELTAS ?? 'N/A'} en el grupo "${group.NOMBRE}".` });
        return;
      }
    }

    // Generate fixtures for each group using its own VUELTAS setting
    const next: FixturesByGroup = {};
    groups.forEach((g) => {
      const teamIds = teamIdsByGroup[g.ID] || [];
      const vueltas = normalizeVueltas(g.VUELTAS);
      next[g.ID] = generateRoundRobinFixtures(teamIds, vueltas, g.ID);
    });

    setFixturesByGroup(next);
    setMessage({ type: 'success', text: 'Programación generada. Revisa el listado y luego guarda.' });
  }, [groups, round, teamIdsByGroup]);

  const handleSave = useCallback(async () => {
    if (!competitionId) return;
    if (!allAssignments.length) {
      setMessage({ type: 'error', text: 'No hay partidos generados para guardar.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc('create_matches', {
        competition_id: competitionId,
        match_assignments: allAssignments,
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Partidos guardados correctamente.' });

      setTimeout(() => {
        navigate('/match-updater');
      }, 800);
    } catch (e: any) {
      console.error('Error saving matches:', e);
      const text = e?.message ? `Error al guardar partidos: ${e.message}` : 'Error al guardar partidos.';
      setMessage({ type: 'error', text });
    } finally {
      setIsSaving(false);
    }
  }, [allAssignments, competitionId, navigate]);

  if (!competitionId || !roundId) {
    return (
      <div className="p-4 text-red-600">
        Error: faltan parámetros en la URL (competition y/o round).
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Crear Partidos</h2>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="text-sm text-gray-600 mb-2">
            <strong>Grupos y configuración:</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-4">
            <div>
              <span className="font-semibold">Competencia:</span>{' '}
              {competition ? `${competition.NOMBRE} (${competition.EDICION})` : 'Cargando...'}
            </div>
            <div>
              <span className="font-semibold">Ronda:</span>{' '}
              {round ? `${round.NOMBRE}` : 'Cargando...'}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            {groups.map((g) => (
              <div key={g.ID} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{g.NOMBRE}</span>
                <div className="text-xs text-gray-600">
                  <span className="mr-3">Equipos: {teamIdsByGroup[g.ID]?.length || 0}</span>
                  <span className="mr-3">VUELTAS: {g.VUELTAS ?? 'N/A'}</span>
                  <span>TIPO: {g.TIPO ?? 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || isSaving || groups.length === 0}
              className="px-4 py-2 rounded-lg text-white shadow bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cargando...' : 'Generar programación'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isSaving || allAssignments.length === 0}
              className="px-4 py-2 rounded-lg text-white shadow bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Guardar partidos'}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 p-4 rounded-md border flex justify-between items-center ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-red-100 text-red-700 border-red-300'
              }`}
            >
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="ml-4 text-current hover:opacity-70"
                aria-label="Cerrar mensaje"
                type="button"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-3">
            Partidos generados: <span className="font-semibold">{allAssignments.length}</span>
            {maxMatchday > 0 ? (
              <span>
                {' '}
                | Jornadas: <span className="font-semibold">{maxMatchday}</span>
              </span>
            ) : null}
          </div>

          {allAssignments.length === 0 ? (
            <div className="text-gray-500 text-sm">Aún no hay programación generada.</div>
          ) : (
            <div className="space-y-6">
              {Array.from({ length: maxMatchday }, (_, idx) => idx + 1).map((md) => (
                <div key={md} className="border rounded-md p-3">
                  <div className="font-semibold mb-2">Jornada {md}</div>
                  <div className="space-y-3">
                    {groups.map((g) => {
                      const matches = (fixturesByGroup[g.ID] || []).filter((m) => m.matchday === md);
                      if (!matches.length) return null;

                      return (
                        <div key={g.ID}>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">{g.NOMBRE}</div>
                          <div className="space-y-1 text-sm">
                            {matches.map((m, i) => (
                              <div key={`${g.ID}-${md}-${i}`} className="flex justify-between gap-2">
                                <span className="truncate">{teamsById.get(m.home_team)?.nombre ?? `Equipo ${m.home_team}`}</span>
                                <span className="text-gray-500">vs</span>
                                <span className="truncate text-right">{teamsById.get(m.away_team)?.nombre ?? `Equipo ${m.away_team}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
