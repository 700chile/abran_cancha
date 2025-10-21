// src/components/PenalesUpdater.tsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface PenaltyMatch {
  id: number;
  local: string;
  visita: string;
  fecha?: string;
  campeonato?: string;
}

interface Jugadora {
  ID: number;
  NOMBRE: string;
  APELLIDO: string;
}

type ResultadoTipo = 'CONVERTIDO' | 'NO CONVERTIDO';

export default function PenalesUpdater() {
  const [matches, setMatches] = useState<PenaltyMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PenaltyMatch | null>(null);
  const [jugadoras, setJugadoras] = useState<Jugadora[]>([]);
  const [selectedJugadora, setSelectedJugadora] = useState<Jugadora | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Jugadora[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTipo>('CONVERTIDO');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch matches eligible for penalties
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase.rpc('get_penalty_matches');
        if (error) throw error;
        setMatches(data || []);
      } catch (err) {
        console.error('Error fetching penalty matches:', err);
        setError('Error cargando los partidos para penales');
      }
    };
    fetchMatches();
  }, []);

  // Fetch players for the selected match
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!selectedMatch) {
        setJugadoras([]);
        setSelectedJugadora(null);
        setSearchQuery('');
        setFilteredPlayers([]);
        return;
      }

      setLoadingPlayers(true);
      setError(null);
      setSearchQuery('');
      setFilteredPlayers([]);

      try {
        const { data: playersData, error: playersError } = await supabase.rpc('get_match_players', {
          match: selectedMatch.id,
        });
        if (playersError) throw playersError;

        const uniquePlayers = new Map<number, Jugadora>();
        (playersData || []).forEach((player: any) => {
          const playerId: number = player.id_jugadora || player.ID || player.id;
          if (!playerId) return;
          if (!uniquePlayers.has(playerId)) {
            uniquePlayers.set(playerId, {
              ID: playerId,
              NOMBRE: player.nombre || player.NOMBRE || '',
              APELLIDO: player.apellido || player.APELLIDO || '',
            });
          }
        });
        setJugadoras(Array.from(uniquePlayers.values()));
      } catch (err: any) {
        console.error('Error fetching players:', err);
        setError('Error al cargar las jugadoras');
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, [selectedMatch]);

  const handlePlayerSelect = (jugadora: Jugadora) => {
    setSelectedJugadora(jugadora);
    setSearchQuery(`${jugadora.NOMBRE || ''} ${jugadora.APELLIDO || ''}`.trim());
    setShowDropdown(false);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedMatch) {
      setError('Por favor selecciona un partido');
      return;
    }
    if (!selectedJugadora) {
      setError('Por favor selecciona una jugadora');
      return;
    }

    const matchId = selectedMatch.id; // use local value to avoid state races
    const playerId = selectedJugadora.ID;

    setLoadingSubmit(true);
    try {
      // Check if nomina exists
      const { data: existingNomina, error: checkError } = await supabase
        .from('nomina')
        .select('ID')
        .eq('ID_JUGADORA', playerId)
        .eq('ID_PARTIDO', matchId)
        .maybeSingle();

      if (checkError) throw checkError;

      let nominaId: number | null = null;
      if (existingNomina) {
        nominaId = (existingNomina as any).ID;
      } else {
        // Create nomina if missing
        const { data: nominaData, error: nominaError } = await supabase
          .from('nomina')
          .insert({
            ID_JUGADORA: playerId,
            ID_PARTIDO: matchId,
          })
          .select('ID');
        if (nominaError) throw nominaError;
        nominaId = nominaData?.[0]?.ID;
        if (!nominaId) throw new Error('No se pudo obtener el ID de nómina');
      }

      // Insert into penales
      const { error: penalesError } = await supabase.from('penales').insert({
        ID_PARTIDO: matchId,
        ID_NOMINA: nominaId,
        RESULTADO: resultado === 'CONVERTIDO',
      });
      if (penalesError) throw penalesError;

      // Success
      setSelectedMatch(null);
      setSelectedJugadora(null);
      setSearchQuery('');
      setFilteredPlayers([]);
      setResultado('CONVERTIDO');
      setSuccessMessage('¡Penal registrado exitosamente!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refetch matches in case UI needs refresh
      try {
        const { data, error } = await supabase.rpc('get_penalty_matches');
        if (!error && data) setMatches(data);
      } catch {}
    } catch (err) {
      console.error('Error inserting penalty:', err);
      setError('Error al registrar el penal. Intenta nuevamente.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full px-0 sm:px-2 lg:px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
          REGISTRAR PENALES
        </h1>

        <div className="bg-white rounded-lg shadow-md p-4">
          {successMessage && (
            <div className="bg-green-50 text-green-500 p-2 rounded mb-4">{successMessage}</div>
          )}
          {error && <div className="bg-red-50 text-red-500 p-2 rounded mb-4">{error}</div>}

          <div className="space-y-4">
            {/* Match Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partido</label>
              <select
                value={selectedMatch?.id || ''}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  const match = matches.find((m) => m.id === id) || null;
                  setSelectedMatch(match);
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecciona un partido</option>
                {matches.map((match) => (
                  <option key={`match-${match.id}`} value={match.id}>
                    {match.local} vs {match.visita}
                  </option>
                ))}
              </select>
            </div>

            {/* Jugadora Selection with Autocomplete */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jugadora</label>
              <div className="relative">
                <input
                  type="text"
                  ref={inputRef}
                  value={selectedJugadora ? `${selectedJugadora.NOMBRE} ${selectedJugadora.APELLIDO}` : searchQuery}
                  onChange={(e) => {
                    const query = e.target.value.trim();
                    setSearchQuery(query);
                    setSelectedJugadora(null);

                    if (query.length > 0) {
                      const searchTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
                      const filtered = jugadoras.filter((j) => {
                        if (!j.ID) return false;
                        const fullName = `${j.NOMBRE || ''} ${j.APELLIDO || ''}`.toLowerCase().trim();
                        const nombre = (j.NOMBRE || '').toLowerCase();
                        const apellido = (j.APELLIDO || '').toLowerCase();
                        return searchTerms.every((term) => nombre.includes(term) || apellido.includes(term) || fullName.includes(term));
                      });
                      setFilteredPlayers(filtered);
                      setShowDropdown(true);
                    } else {
                      setFilteredPlayers([]);
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (jugadoras.length > 0 && !selectedJugadora) {
                      setFilteredPlayers(jugadoras);
                      setShowDropdown(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="w-full p-2 border rounded"
                  placeholder={loadingPlayers ? 'Cargando jugadoras...' : 'Buscar jugadora...'}
                  disabled={!selectedMatch || loadingPlayers}
                />

                {loadingPlayers && (
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {showDropdown && filteredPlayers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                    {filteredPlayers.map((j) => (
                      <div
                        key={`player-${j.ID}`}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handlePlayerSelect(j);
                        }}
                      >
                        <div className="font-medium">{j.NOMBRE} {j.APELLIDO}</div>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && filteredPlayers.length === 0 && searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg p-2 text-gray-500">
                    No se encontraron jugadoras que coincidan con "{searchQuery}"
                  </div>
                )}
              </div>
            </div>

            {/* Resultado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resultado del Penal</label>
              <select
                value={resultado}
                onChange={(e) => setResultado(e.target.value as ResultadoTipo)}
                className="w-full p-2 border rounded"
                disabled={!selectedMatch || !selectedJugadora}
              >
                <option value="CONVERTIDO">CONVERTIDO</option>
                <option value="NO CONVERTIDO">NO CONVERTIDO</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={!selectedMatch || !selectedJugadora || loadingSubmit}
            >
              {loadingSubmit ? 'Guardando...' : 'REGISTRAR PENAL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
