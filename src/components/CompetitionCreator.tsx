import React, { useState } from 'react';
import type { CompetitionFormState, RoundType, RoundVueltas } from '../types';
import { COMPETITION_TYPES, ROUND_TYPES, ROUND_VUELTAS } from '../types';
import { createCompetition } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Message {
    type: 'success' | 'error';
    text: string;
}

export const CompetitionCreator = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<CompetitionFormState>({
        competition: {
            NOMBRE: '',
            EDICION: '',
            RONDAS_CANT: 0,
            EQUIPOS_CANT: 0,
            TIPO: COMPETITION_TYPES[0],
            MARCA: ''
        },
        rounds: []
    });
    const [message, setMessage] = useState<Message | null>(null);

    const handleCompetitionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            competition: {
                ...prev.competition,
                [name]: value
            }
        }));
    };

    const handleRoundChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, roundIndex: number) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newRounds = prev.rounds.map((round, index) => {
                if (index === roundIndex) {
                    if (name === 'GRUPOS_CANT') {
                        const newGroupsCount = parseInt(value);
                        const currentGroups = round.GRUPOS;
                        
                        // Create new groups array with the correct number of groups
                        const newGroups = [...currentGroups];
                        
                        // Add new groups if needed
                        for (let i = currentGroups.length; i < newGroupsCount; i++) {
                            newGroups.push({ 
                                ID: Date.now() + i, // Generate a temporary unique ID
                                NOMBRE: `GRUPO ${i + 1}`, 
                                EQUIPOS_CANT: 0,
                                EQUIPOS: [] 
                            });
                        }
                        
                        // Remove extra groups if needed
                        if (newGroupsCount < currentGroups.length) {
                            newGroups.length = newGroupsCount;
                        }
                        
                        return { ...round, [name]: newGroupsCount, GRUPOS: newGroups };
                    }
                    return { ...round, [name]: value };
                }
                return round;
            });
            return { ...prev, rounds: newRounds };
        });
    };

    const handleRoundFormatChange = (e: React.ChangeEvent<HTMLSelectElement>, roundIndex: number) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            rounds: prev.rounds.map((round, index) =>
                index === roundIndex ? { ...round, [name]: value } : round
            )
        }));
    };

    const handleGroupChange = (e: React.ChangeEvent<HTMLInputElement>, roundIndex: number, groupIndex: number) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            rounds: prev.rounds.map((round, rIndex) =>
                rIndex === roundIndex ? {
                    ...round,
                    GRUPOS: round.GRUPOS.map((group, gIndex) =>
                        gIndex === groupIndex ? { ...group, [name]: value } : group
                    )
                } : round
            )
        }));
    };

    const addRound = () => {
        setFormData(prev => ({
            ...prev,
            rounds: [...prev.rounds, {
                NOMBRE: '',
                TIPO: 'TODOS CONTRA TODOS' as RoundType,
                VUELTAS: 'UNA VUELTA' as RoundVueltas,
                GRUPOS_CANT: 0,
                GRUPOS: [],
                ORDINAL: prev.rounds.length + 1
            }]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateTeamCount();
        if (validationError) {
            setMessage({ type: 'error', text: validationError });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        console.log('Raw form data:', formData);

        // Transform competition data from nested object
        const competitionData = {
            NOMBRE: formData.competition.NOMBRE,
            EDICION: formData.competition.EDICION,
            RONDAS_CANT: formData.competition.RONDAS_CANT,
            EQUIPOS_CANT: formData.competition.EQUIPOS_CANT,
            TIPO: formData.competition.TIPO,
            MARCA: formData.competition.MARCA
        };

        console.log('Transformed competition data:', competitionData);

        // Transform rounds data to match SQL function expectations
        const roundsData = formData.rounds.map(round => ({
            NOMBRE: round.NOMBRE,
            TIPO: round.TIPO,
            VUELTAS: round.VUELTAS,
            GRUPOS_CANT: round.GRUPOS_CANT,
            ORDINAL: round.ORDINAL ?? 1,
            GRUPOS: round.GRUPOS.map(group => ({
                NOMBRE: group.NOMBRE,
                EQUIPOS_CANT: group.EQUIPOS_CANT
            }))
        }));

        console.log('Transformed rounds data:', roundsData);

        // Convert rounds data to JSON string as expected by the SQL function
        const roundsJson = JSON.stringify(roundsData);

        console.log('JSON string of rounds:', roundsJson);

        try {
            await createCompetition(competitionData, roundsJson);
            
            const { data: competition, error: error } = await supabase
                .from('campeonato')
                .select('ID')
                .eq('NOMBRE', formData.competition.NOMBRE)
                .eq('EDICION', formData.competition.EDICION)
                .single();

            if (error) throw error;
            if (!competition) throw new Error('Competition not found');

            // Get the minimum round ID for this competition
            const { data: rounds, error: roundsError } = await supabase
                .from('ronda')
                .select('ID')
                .eq('ID_CAMPEONATO', competition.ID)
                .order('ID', { ascending: true })
                .limit(1);

            if (roundsError || !rounds || rounds.length === 0) {
                throw new Error('No se encontraron rondas para esta competencia');
            }

            const minRoundId = rounds[0].ID;
            
            // Redirect to team selection page with competition ID and minimum round ID
            navigate(`/competition/${competition.ID}/round/${minRoundId}/select-teams`);
        } catch (error) {
            console.error('Error creating competition:', error);
            setMessage({ type: 'error', text: 'Error al crear la competencia' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const validateTeamCount = (): string | null => {
        for (const round of formData.rounds) {
            const roundTeams = round.GRUPOS.reduce((acc: number, group: { EQUIPOS_CANT: number }) => {
                return acc + group.EQUIPOS_CANT;
            }, 0);

            if (roundTeams > formData.competition.EQUIPOS_CANT) {
                return `La ronda "${round.NOMBRE}" tiene ${roundTeams} equipos, lo cual excede el número máximo permitido (${formData.competition.EQUIPOS_CANT})`;
            }
        }
        return null;
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Crear Nueva Competencia</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Competition Info */}
                <div>
                    <h2 className="text-xl font-semibold mb-2">Información de la Competencia</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="NOMBRE" className="block text-sm font-medium mb-1">Nombre</label>
                            <input
                                type="text"
                                id="NOMBRE"
                                name="NOMBRE"
                                value={formData.competition.NOMBRE}
                                onChange={handleCompetitionChange}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="EDICION" className="block text-sm font-medium mb-1">Edición</label>
                            <input
                                type="text"
                                id="EDICION"
                                name="EDICION"
                                value={formData.competition.EDICION}
                                onChange={handleCompetitionChange}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="RONDAS_CANT" className="block text-sm font-medium mb-1">Rondas</label>
                            <input
                                type="number"
                                id="RONDAS_CANT"
                                name="RONDAS_CANT"
                                value={formData.competition.RONDAS_CANT}
                                onChange={handleCompetitionChange}
                                className="w-full px-3 py-2 border rounded-md"
                                min="1"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="EQUIPOS_CANT" className="block text-sm font-medium mb-1">Equipos Totales</label>
                            <input
                                type="number"
                                id="EQUIPOS_CANT"
                                name="EQUIPOS_CANT"
                                value={formData.competition.EQUIPOS_CANT}
                                onChange={handleCompetitionChange}
                                className="w-full px-3 py-2 border rounded-md"
                                min="1"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="TIPO" className="block text-sm font-medium mb-1">Tipo</label>
                            <select
                                id="TIPO"
                                name="TIPO"
                                value={formData.competition.TIPO}
                                onChange={handleCompetitionChange}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                {COMPETITION_TYPES.map(type => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="MARCA" className="block text-sm font-medium mb-1">Marca</label>
                            <input
                                type="text"
                                id="MARCA"
                                name="MARCA"
                                value={formData.competition.MARCA}
                                onChange={handleCompetitionChange}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Rounds */}
                <div>
                    <h2 className="text-xl font-semibold mb-2">Rondas</h2>
                    {formData.rounds.map((round, roundIndex) => (
                        <div key={roundIndex} className="bg-gray-50 p-4 rounded-lg mb-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`round-${roundIndex}-NOMBRE`} className="block text-sm font-medium mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        id={`round-${roundIndex}-NOMBRE`}
                                        name="NOMBRE"
                                        value={round.NOMBRE}
                                        onChange={(e) => handleRoundChange(e, roundIndex)}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`round-${roundIndex}-TIPO`} className="block text-sm font-medium mb-1">Tipo</label>
                                    <select
                                        id={`round-${roundIndex}-TIPO`}
                                        name="TIPO"
                                        value={round.TIPO}
                                        onChange={(e) => handleRoundFormatChange(e, roundIndex)}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        {ROUND_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`round-${roundIndex}-VUELTAS`} className="block text-sm font-medium mb-1">Vueltas</label>
                                    <select
                                        id={`round-${roundIndex}-VUELTAS`}
                                        name="VUELTAS"
                                        value={round.VUELTAS}
                                        onChange={(e) => handleRoundFormatChange(e, roundIndex)}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        {ROUND_VUELTAS.map(vueltas => (
                                            <option key={vueltas} value={vueltas}>
                                                {vueltas}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`round-${roundIndex}-GRUPOS_CANT`} className="block text-sm font-medium mb-1">Grupos</label>
                                    <input
                                        type="number"
                                        id={`round-${roundIndex}-GRUPOS_CANT`}
                                        name="GRUPOS_CANT"
                                        value={round.GRUPOS_CANT}
                                        onChange={(e) => handleRoundChange(e, roundIndex)}
                                        className="w-full px-3 py-2 border rounded-md"
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Groups */}
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Grupos</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {round.GRUPOS.map((group, groupIndex) => (
                                        <div key={groupIndex}>
                                            <label htmlFor={`group-${roundIndex}-${groupIndex}-NOMBRE`} className="block text-sm font-medium mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                id={`group-${roundIndex}-${groupIndex}-NOMBRE`}
                                                name="NOMBRE"
                                                value={group.NOMBRE}
                                                onChange={(e) => handleGroupChange(e, roundIndex, groupIndex)}
                                                className="w-full px-3 py-2 border rounded-md"
                                                required
                                            />
                                            <label htmlFor={`group-${roundIndex}-${groupIndex}-EQUIPOS_CANT`} className="block text-sm font-medium mb-1">Equipos</label>
                                            <input
                                                type="number"
                                                id={`group-${roundIndex}-${groupIndex}-EQUIPOS_CANT`}
                                                name="EQUIPOS_CANT"
                                                value={group.EQUIPOS_CANT}
                                                onChange={(e) => handleGroupChange(e, roundIndex, groupIndex)}
                                                className="w-full px-3 py-2 border rounded-md"
                                                min="1"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addRound}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        Agregar Ronda
                    </button>
                </div>

                {/* Submit Button */}
                <div>
                    <button
                        type="submit"
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                        Crear Competencia
                    </button>
                </div>
            </form>

            {/* Message Display */}
            {message && (
                <div className={`mt-4 p-4 rounded-md ${
                    message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default CompetitionCreator;
