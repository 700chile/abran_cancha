// src/components/TopScorers.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getTeamLogo } from '../utils/teamLogos';
import { renderTopScorersPoster } from './PosterTopScorersCanvas';

interface TopScorer {
    nombre_jugadora: string;
    equipo: string;
    goles: number;
}

interface Competition {
    ID: number;
    NOMBRE: string;
    EDICION: string;
}

const TopScorers = () => {
    const [scorers, setScorers] = useState<TopScorer[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);
    const [selectedCompetition, setSelectedCompetition] = useState<number>(2);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                const { data, error } = await supabase
                    .from('campeonato')
                    .select('ID, NOMBRE, EDICION')
                    .order('EDICION', { ascending: false })
                    .order('NOMBRE');

                if (error) throw error;
                setCompetitions(data || []);
            } catch (error) {
                console.error('Error fetching competitions:', error);
            }
        };

        fetchCompetitions();
    }, []);

    useEffect(() => {
        const fetchLastUpdateDate = async () => {
            try {
                const { data, error } = await supabase
                    .rpc('get_max_date_by_group_id', {
                        group_id: selectedCompetition
                    });

                if (error) throw error;
                if (data && typeof data === 'string') {
                    const dateStr = data;
                    const [year, month, day] = dateStr.split('-');
                    const parsedYear = parseInt(year);
                    const parsedMonth = parseInt(month);
                    const parsedDay = parseInt(day);
                    
                    if (!isNaN(parsedYear) && !isNaN(parsedMonth) && !isNaN(parsedDay)) {
                        setLastUpdateDate(new Date(parsedYear, parsedMonth - 1, parsedDay));
                    }
                } else {
                    console.error('Unexpected date data format:', data);
                }
            } catch (error) {
                console.error('Error fetching last update date:', error);
            }
        };

        const fetchScorers = async () => {
            try {
                const { data, error } = await supabase
                    .rpc('get_top_scorers', {
                        grupo_id_param: selectedCompetition
                    });

                if (error) {
                    console.error('Error fetching scorers:', error);
                    throw error;
                }

                console.log('Raw data from Supabase:', data);
                
                if (!data || !Array.isArray(data) || data.length === 0) {
                    console.log('No data returned from Supabase');
                    setScorers([]);
                    return;
                }

                // The stored procedure returns an array of objects with different property names
                const mappedData = data.map((row: any) => ({
                    nombre_jugadora: row.jugadora || 'Sin nombre',
                    equipo: row.equipo || 'Sin equipo',
                    goles: parseInt(row.goles) || 0
                }));

                console.log('Mapped data:', mappedData);

                if (mappedData.some(scorer => scorer.nombre_jugadora === '' || scorer.nombre_jugadora === null)) {
                    console.error('Some players have null names:', mappedData);
                }

                // Sort by goals in descending order
                const sortedData = mappedData.sort((a, b) => b.goles - a.goles);
                setScorers(sortedData as TopScorer[]);

            } catch (error) {
                console.error('Error processing scorers:', error);
                setScorers([]);
            } finally {
                setLoading(false);
            }
        };

        Promise.all([fetchScorers(), fetchLastUpdateDate()]);
    }, [selectedCompetition]);

    const generatePoster = async () => {
        if (scorers.length === 0) {
            alert('No hay datos de goleadoras para generar el póster');
            return;
        }

        setIsGeneratingPoster(true);
        
        try {
            // Ask for background image
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            const file = await new Promise<File>((resolve) => {
                input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files[0]) {
                        resolve(target.files[0]);
                    }
                };
                input.click();
            });

            if (!file) {
                setIsGeneratingPoster(false);
                return;
            }

            // Ask for credit
            const credit = prompt('Ingrese el crédito (opcional):') || undefined;

            // Convert file to data URL
            const bgUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });

            // Get competition info
            const competition = competitions.find(c => c.ID === selectedCompetition);
            const title = 'TABLA DE GOLEADORAS';
            const subtitle = competition ? `PRIMERA DIVISIÓN ${competition.EDICION}` : 'PRIMERA DIVISIÓN';

            // Map top scorers data for poster
            const posterData = scorers.slice(0, 10).map(scorer => ({
                player_name: scorer.nombre_jugadora,
                team_name: scorer.equipo,
                goals: scorer.goles
            }));

            // Generate poster
            const dataUrl = await renderTopScorersPoster(posterData, {
                backgroundUrl: bgUrl,
                title,
                subtitle,
                credit,
            });

            // Download the image
            const link = document.createElement('a');
            link.download = `goleadoras-${competition?.EDICION || '2026'}.jpg`;
            link.href = dataUrl;
            link.click();

        } catch (error) {
            console.error('Error generating poster:', error);
            alert('Error al generar el póster. Por favor, inténtelo de nuevo.');
        } finally {
            setIsGeneratingPoster(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="w-full px-0 sm:px-2 lg:px-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
                    GOLEADORAS
                </h1>

                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                    <div>
                        <label htmlFor="competition" className="text-xs font-semibold text-gray-600 uppercase">CAMPEONATO</label>
                        <select 
                            id="competition"
                            className="w-full p-2 border rounded-lg bg-brand-primary text-black"
                            value={selectedCompetition}
                            onChange={(e) => setSelectedCompetition(Number(e.target.value))}
                        >
                            {competitions.map((competition) => (
                                <option key={competition.ID} value={competition.ID}>
                                    {competition.NOMBRE} {competition.EDICION}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={generatePoster}
                            disabled={isGeneratingPoster || loading || scorers.length === 0}
                            className="px-4 py-2 rounded-lg text-white shadow bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isGeneratingPoster ? 'Generando...' : 'Generar Imagen'}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-2 text-right text-sm text-gray-500">
                        Refleja partidos hasta: {lastUpdateDate ? lastUpdateDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/-/g, '/') : 'Cargando...'}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-y-2.5 text-center">
                            <thead className="bg-brand-primary text-black">
                                <tr>
                                    <th className="p-3 font-semibold uppercase text-sm w-20">POS</th>
                                    <th className="p-3 font-semibold uppercase text-sm w-60">JUGADORA</th>
                                    <th className="p-3 font-semibold uppercase text-sm rounded-r-md w-20">GOLES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-gray-500">Cargando...</td></tr>
                                ) : (
                                    scorers.map((scorer, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="px-3 py-3">
                                                <div className="flex items-center justify-center">
                                                    <span className="font-semibold">{index + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <img 
                                                        src={getTeamLogo(scorer.equipo) || '/default-team-logo.png'} 
                                                        alt={scorer.equipo} 
                                                        className="w-8 h-8 rounded-full" 
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.onerror = null;
                                                            target.src = '/default-team-logo.png';
                                                        }}
                                                    />
                                                    <span>{scorer.nombre_jugadora}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">{scorer.goles}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopScorers;
