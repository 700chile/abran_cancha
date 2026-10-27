import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface Competition {
  ID: number;
  NOMBRE: string;
  EDICION: string;
}

const DefaultCompetitionSelector: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
  const [currentDefault, setCurrentDefault] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch eligible competitions and current default
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch eligible competitions
        const { data: eligibleData, error: eligibleError } = await supabase.rpc('get_default_elegible_competitions');
        if (eligibleError) throw eligibleError;

        // Map lowercase column names to uppercase to match the interface
        const mappedData = eligibleData?.map((c: any) => ({
          ID: c.id,
          NOMBRE: c.nombre,
          EDICION: c.edición
        })) || [];

        setCompetitions(mappedData);

        // Fetch current default competition
        const { data: defaultData, error: defaultError } = await supabase.rpc('get_default_competition');
        if (defaultError) throw defaultError;

        setCurrentDefault(defaultData);

        // Set selected competition to current default if exists
        if (defaultData) {
          setSelectedCompetition(defaultData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSetDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetition) {
      setError('Por favor selecciona una competición');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Insert new default competition
      const { error: insertError } = await supabase
        .from('campeonato_by_default')
        .insert({
          id_campeonato: selectedCompetition
        });

      if (insertError) throw insertError;

      setSuccessMessage('Competición predeterminada actualizada exitosamente');
      setCurrentDefault(selectedCompetition);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error setting default competition:', err);
      setError('Error al establecer la competición predeterminada');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Establecer Competición Predeterminada</h2>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {currentDefault && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
          Competición predeterminada actual: <strong>
            {competitions.find(c => c.ID === currentDefault)?.NOMBRE} {
              competitions.find(c => c.ID === currentDefault)?.EDICION
            }
          </strong>
        </div>
      )}

      <form onSubmit={handleSetDefault} className="space-y-6">
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

        <div className="flex justify-center">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !selectedCompetition}
          >
            {isLoading ? 'Guardando...' : 'Establecer como predeterminada'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DefaultCompetitionSelector;
