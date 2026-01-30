// src/components/LeagueStandings.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getTeamLogo } from '../utils/teamLogos';
import { renderStandingsPoster, type StandingsPosterRow } from './PosterStandingsCanvas';

interface TeamStanding {
    pos: number;
    var: string;
    nombre: string;
    chapa?: string; // Nickname field, optional
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    dif: number;
    pts: number;
    grupo: string;
}

// Helper function to get the appropriate icon for VAR status
const getVarIcon = (status: string) => {
    if (status === 'SUBE') {
        return <span className="text-green-500">▲</span>;
    } else if (status === 'BAJA') {
        return <span className="text-red-500">▼</span>;
    }
    return null;
};


interface Competition {
    ID: number;
    NOMBRE: string;
    EDICION: string;
}

interface Group {
    ID: number;
    NOMBRE: string;
}

const LeagueStandings = () => {
    const [standings, setStandings] = useState<TeamStanding[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<number>(2);
    const [selectedGroup, setSelectedGroup] = useState<string>('ZONA A');
    const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchLeagueData = useCallback(async () => {
        try {
            // Fetch competitions
            const { data: competitionsData, error: competitionsError } = await supabase
                .from('campeonato')
                .select('ID, NOMBRE, EDICION')
                .order('ID');

            if (competitionsError) throw competitionsError;
            setCompetitions(competitionsData || []);

            // If no competition selected, return early
            if (!selectedCompetition) return;

            // Fetch all ronda IDs for the selected competition
            const { data: rondaData, error: rondaError } = await supabase
                .from('ronda')
                .select('ID')
                .eq('ID_CAMPEONATO', selectedCompetition);

            if (rondaError) throw rondaError;
            const rondaIds = rondaData?.map(r => r.ID) || [];

            // Fetch all groups for the selected competition
            const { data: groupsData, error: groupsError } = await supabase
                .from('grupo')
                .select('ID, NOMBRE')
                .eq('TIPO', 'TODOS CONTRA TODOS')
                .in('ID_RONDA', rondaIds)
                .order('NOMBRE', { ascending: true });

            if (groupsError) throw groupsError;
            setGroups(groupsData || []);
            // Auto-select first group if none selected
            if (groupsData && groupsData.length > 0 && !selectedGroup) {
                setSelectedGroup(groupsData[0].NOMBRE);
            }

            // Fetch standings for each group
            const groupStandings = await Promise.all(
                groupsData?.map(async (group) => {
                    const { data: standingsData, error: standingsError } = await supabase
                        .rpc('get_standings', { grupo_param: group.ID });

                    if (standingsError) throw standingsError;
                    return { group: group.NOMBRE, standings: standingsData || [] };
                }) || []
            );



            // Map the data to match our TeamStanding interface
            const mappedData = groupStandings.flatMap(({ group, standings }) =>
                standings.map((row: any) => ({
                    pos: row.pos,
                    var: row.var,
                    nombre: row.nombre,
                    chapa: row.chapa, // Add the chapa field mapping
                    pj: row.pj,
                    pg: row.pg,
                    pe: row.pe,
                    pp: row.pp,
                    gf: row.gf,
                    gc: row.gc,
                    dif: row.dif,
                    pts: row.pts,
                    grupo: group
                }))
            );

            // Fetch max date for each group and find the latest date
            const groupDates = await Promise.all(
                groupsData?.map(async (group) => {
                    const { data: dateData, error: dateError } = await supabase
                        .rpc('get_max_date_by_group_id', { group_id: group.ID });

                    if (dateError) throw dateError;
                    return dateData ? new Date(dateData) : null;
                }) || []
            );

            // Find the latest date among all groups
            const latestDate = groupDates
                .filter((date): date is Date => date !== null)
                .reduce((latest, current) => current > latest ? current : latest, new Date('1970-01-01'));

            setLastUpdateDate(latestDate);
            setStandings(mappedData as TeamStanding[]);

        } catch (error) {
            console.error('Error fetching league data:', error);
            setStandings([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    }, [selectedCompetition]);

    // Re-fetch data when competition changes
    useEffect(() => {
        fetchLeagueData();
    }, [selectedCompetition, fetchLeagueData]); // Re-fetch when selectedCompetition changes

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="w-full px-0 sm:px-2 lg:px-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
                    TABLA DE POSICIONES
                </h1>

                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                    <div>
                        <label htmlFor="competition" className="text-xs font-semibold text-gray-600 uppercase">COMPETICIÓN</label>
                        <select
                            id="competition"
                            className="w-full p-2 bg-brand-primary text-black rounded-lg"
                            value={selectedCompetition}
                            onChange={(e) => setSelectedCompetition(Number(e.target.value))}
                        >
                            {competitions.map(competition => (
                                <option key={competition.ID} value={competition.ID}>
                                    {competition.NOMBRE} {competition.EDICION}
                                </option>
                            ))}
                        </select>
                    </div>
                    {groups.length > 1 && (
                        <div>
                            <label htmlFor="group" className="text-xs font-semibold text-gray-600 uppercase">GRUPO</label>
                            <select
                                id="group"
                                className="w-full p-2 bg-brand-primary text-black rounded-lg"
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                            >
                                {groups.map(group => (
                                    <option key={group.ID} value={group.NOMBRE}>
                                        {group.NOMBRE}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex justify-end mb-4">
                    <button
                        className="px-4 py-2 rounded-lg text-white shadow bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGeneratingPoster || !groups.length || !selectedGroup}
                        onClick={() => {
                            if (!groups.length || !selectedGroup) return;
                            fileInputRef.current?.click();
                        }}
                    >
                        {isGeneratingPoster ? 'Generando...' : 'Generar imagen'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsGeneratingPoster(true);
                            try {
                                const bgUrl = URL.createObjectURL(file);
                                const comp = competitions.find(c => c.ID === selectedCompetition);
                                const credit = prompt('Crédito/Fuente de la foto (ej: @fotógrafo):') || '';
                                const groupStandings = standings.filter(s => s.grupo === selectedGroup);
                                const rows: StandingsPosterRow[] = groupStandings
                                  .sort((a, b) => a.pos - b.pos)
                                  .map((r) => {
                                    console.log('Full team object:', r);
                                    console.log('Team data:', { 
                                      pos: r.pos, 
                                      nombre: r.nombre, 
                                      chapa: r.chapa, 
                                      final: r.chapa || r.nombre 
                                    });
                                    return {
                                      pos: r.pos,
                                      club: r.chapa || r.nombre, // Use chapa if available, otherwise nombre
                                      pj: r.pj,
                                      dif: r.dif,
                                      pts: r.pts,
                                      rend: r.pj > 0 ? Math.round(((r.pg * 3 + r.pe) / (r.pj * 3)) * 100) : 0,
                                      var: r.var,
                                    };
                                  });
                                const dataUrl = await renderStandingsPoster(rows, {
                                  backgroundUrl: bgUrl,
                                  title: 'TABLA DE POSICIONES',
                                  subtitle: comp ? `PRIMERA DIVISIÓN ${comp.EDICION}` : 'PRIMERA DIVISIÓN',
                                  credit,
                                  competitionId: selectedCompetition,
                                  totalTeams: groupStandings.length,
                                });
                                const a = document.createElement('a');
                                a.href = dataUrl;
                                a.download = `tabla_posiciones_${comp?.EDICION || ''}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(bgUrl);
                            } catch (e) {
                                console.error('Error generando póster de posiciones', e);
                                alert('No se pudo generar la imagen. Revisa la consola para más detalles.');
                            } finally {
                                setIsGeneratingPoster(false);
                            }
                            // Reset input so same file can be selected again
                            e.target.value = '';
                        }}
                    />
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-2 text-right text-sm text-gray-500">
                        {selectedCompetition && competitions.find(c => c.ID === selectedCompetition)?.NOMBRE || 'Cargando...'}
                    </div>
                    <div className="overflow-x-auto">
                        {!loading && groups.length > 0 && (
                            <div className="mt-4 space-y-8">
                                {groups.map((group) => (
                                    <div key={group.ID}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold">{group.NOMBRE}</h3>
                                            <p className="text-sm text-gray-500">
                                                Refleja partidos hasta: {lastUpdateDate?.toLocaleDateString()}
                                            </p>
                                        </div>
                                        <table className="min-w-full bg-white shadow-lg rounded-lg">
                                            <thead className="bg-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PJ</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PG</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PP</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GF</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GC</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DIF</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PTS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {standings
                                                    .filter(s => s.grupo === group.NOMBRE)
                                                    .sort((a, b) => a.pos - b.pos)
                                                    .map((row, index) => (
                                                        <tr key={index} className={`hover:bg-gray-50 ${index === 0 ? 'bg-green-50' : ''}`}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 relative">
                                                            <div className="flex items-center gap-2">
                                                                <span>{row.pos}</span>
                                                                {getVarIcon(row.var)}
                                                            </div>
                                                            {selectedCompetition === 33 ? (
                                                                // ID = 33 competition logic
                                                                <>
                                                                    {row.pos <= 2 && (
                                                                        <span className="absolute left-0 top-0 h-full w-2 bg-green-500"></span>
                                                                    )}
                                                                    {(row.pos === 3 || row.pos === 4) && (
                                                                        <span className="absolute left-0 top-0 h-full w-2 bg-blue-500"></span>
                                                                    )}
                                                                </>
                                                            ) : selectedCompetition <= 2 ? (
                                                                // National competition logic
                                                                <>
                                                                    {row.pos <= 8 && (
                                                                        <span className="absolute left-0 top-0 h-full w-2 bg-green-500"></span>
                                                                    )}
                                                                    {row.pos >= standings.length - 1 && (
                                                                        <span className="absolute left-0 top-0 h-full w-2 bg-red-500"></span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                // ID = 32 competition logic
                                                                <>
                                                                    {row.pos <= 2 && (
                                                                        <span className="absolute left-0 top-0 h-full w-2 bg-green-500"></span>
                                                                    )}
                                                                    {row.pos === 3 && (
                                                                        <span className="absolute left-0 top-0 h-full w-2 bg-blue-500"></span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <img 
                                                                    src={new URL(getTeamLogo(row.nombre) || '', import.meta.url).href} 
                                                                    alt={row.nombre} 
                                                                    className="w-6 h-6 flex-shrink-0" 
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = 'none';
                                                                    }}
                                                                />
                                                                <span className="text-sm text-gray-900 font-medium">{row.nombre}</span>
                                                            </div>
                                                        </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pj}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pg}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pe}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pp}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.gf}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.gc}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.dif}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pts}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-12">
                        {selectedCompetition === 33 ? (
                            // ID = 33 competition legend
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-500 w-2 h-2 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Top 2 (Clasifican al Mundial)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-500 w-2 h-2 rounded-full"></div>
                                    <span className="text-sm text-gray-600">3ro y 4to (Clasifican al repechaje intercontinental)</span>
                                </div>
                            </>
                        ) : selectedCompetition <= 2 ? (
                            // National competition legend
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-500 w-2 h-2 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Top 8 (Play-offs)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-red-500 w-2 h-2 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Descenso</span>
                                </div>
                            </>
                        ) : (
                            // ID = 32 competition legend
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-500 w-2 h-2 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Top 2 (Semifinales)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-500 w-2 h-2 rounded-full"></div>
                                    <span className="text-sm text-gray-600">3er lugar (5to lugar)</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeagueStandings;