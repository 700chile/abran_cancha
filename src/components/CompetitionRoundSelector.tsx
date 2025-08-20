import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

interface Competition {
  ID: number;
  NOMBRE: string;
  EDICION: string;
}

interface Round {
  ID: number;
  NOMBRE: string;
}

const CompetitionRoundSelector: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch competitions on component mount
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('campeonato')
          .select('ID, NOMBRE, EDICION')
          .order('ID', { ascending: false });

        if (error) throw error;
        setCompetitions(data || []);
      } catch (err) {
        console.error('Error fetching competitions:', err);
        setError('Error al cargar las competiciones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  // Fetch rounds when a competition is selected
  useEffect(() => {
    const fetchRounds = async () => {
      if (!selectedCompetition) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('ronda')
          .select('ID, NOMBRE')
          .eq('ID_CAMPEONATO', selectedCompetition)
          .order('ID');

        if (error) throw error;
        setRounds(data || []);
        setSelectedRound(null);
      } catch (err) {
        console.error('Error fetching rounds:', err);
        setError('Error al cargar las rondas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRounds();
  }, [selectedCompetition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCompetition && selectedRound) {
      navigate(`/competition/${selectedCompetition}/build-matches?round=${selectedRound}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Crear Partidos</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="competition" className="block text-sm font-medium text-gray-700 mb-1">
            Competición
          </label>
          <select
            id="competition"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={selectedCompetition || ''}
            onChange={(e) => setSelectedCompetition(Number(e.target.value) || null)}
            disabled={isLoading}
            required
          >
            <option value="">Selecciona una competición</option>
            {competitions.map((comp) => (
              <option key={comp.ID} value={comp.ID}>
                {comp.NOMBRE} - {comp.EDICION}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="round" className="block text-sm font-medium text-gray-700 mb-1">
            Ronda
          </label>
          <select
            id="round"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={selectedRound || ''}
            onChange={(e) => setSelectedRound(Number(e.target.value) || null)}
            disabled={isLoading || !selectedCompetition || rounds.length === 0}
            required
          >
            <option value="">
              {!selectedCompetition 
                ? 'Selecciona una competición primero' 
                : rounds.length === 0 
                  ? 'No hay rondas disponibles' 
                  : 'Selecciona una ronda'}
            </option>
            {rounds.map((round) => (
              <option key={round.ID} value={round.ID}>
                {round.NOMBRE}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-red-600 text-sm mt-2">{error}</div>
        )}

        <div className="flex justify-center">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !selectedCompetition || !selectedRound}
          >
            {isLoading ? 'Cargando...' : 'Continuar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompetitionRoundSelector;
