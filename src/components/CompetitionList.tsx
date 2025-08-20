import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

interface Competition {
    ID: number;
    NOMBRE: string;
    TIPO: string;
    EDICION: number;
}

export default function CompetitionList() {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCompetitions();
    }, []);

    const fetchCompetitions = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('campeonato')
                .select('*')
                .order('EDICION', { ascending: false })
                .order('NOMBRE');

            if (error) throw error;
            setCompetitions(data);
        } catch (error) {
            console.error('Error fetching competitions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-4">Competencias</h1>
            <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-4">
                    {competitions.map((competition) => (
                        <div key={competition.ID} className="border-b pb-4 last:border-0">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <h3 className="font-medium">{competition.NOMBRE} {competition.EDICION}</h3>
                                    <p className="text-sm text-gray-600">{competition.TIPO}</p>
                                </div>
                                <div className="flex items-center">
                                    <Link to={`/competition/${encodeURIComponent(competition.ID)}/select-teams`}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium inline-flex items-center"
                                    >
                                        Seleccionar Equipos
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
