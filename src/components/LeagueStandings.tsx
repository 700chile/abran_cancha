// src/components/LeagueStandings.jsx

import { useState, useEffect } from 'react';

// --- DATOS DE MUESTRA (Igual que antes, para conectar a Supabase en el futuro) ---
const mockData = [
    { id: 1, rank: 1, name: 'Mud Hens', points: 9, gp: 3, w: 3, l: 0, t: 0, gf: 9, ga: 2, gd: 7 },
    { id: 2, rank: 2, name: 'Shooters', points: 9, gp: 3, w: 3, l: 0, t: 0, gf: 11, ga: 5, gd: 6 },
    { id: 3, rank: 3, name: 'Cosmos', points: 6, gp: 3, w: 2, l: 1, t: 0, gf: 4, ga: 3, gd: 1 },
    { id: 4, rank: 4, name: 'Muddies', points: 6, gp: 3, w: 2, l: 1, t: 0, gf: 9, ga: 9, gd: 0 },
    { id: 5, rank: 5, name: 'Whipsaws FC', points: 3, gp: 3, w: 1, l: 2, t: 0, gf: 9, ga: 11, gd: -2 },
    { id: 6, rank: 6, name: 'Medusa', points: 1, gp: 3, w: 0, l: 2, t: 1, gf: 2, ga: 5, gd: -3 },
    { id: 7, rank: 7, name: 'Red Hots', points: 1, gp: 3, w: 0, l: 2, t: 1, gf: 5, ga: 10, gd: -5 },
    { id: 8, rank: 8, name: 'Mud and Glory', points: 0, gp: 3, w: 0, l: 3, t: 0, gf: 5, ga: 9, gd: -4 },
];

const columnHeaders = {
    team: 'EQUIPO', points: 'PUNTOS', gp: 'PJ', w: 'G', l: 'P', t: 'E', gf: 'GF', ga: 'GC', gd: 'DIF',
};

// Objeto para mapear el ranking a un color de Tailwind
const rankColors = {
    1: 'bg-rank-1',
    2: 'bg-rank-2',
    3: 'bg-rank-3',
};


const LeagueStandings = () => {
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // --- FUTURA LLAMADA A SUPABASE ---
        // El código para conectar a tu API irá aquí.
        const timer = setTimeout(() => {
            setStandings(mockData);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Estilo para el ícono de flecha en el select
    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">
                    TABLA DE POSICIONES LIGA FEMENINA
                </h1>

                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                    <div>
                        <label htmlFor="division" className="text-xs font-semibold text-gray-600 uppercase">DIVISIÓN</label>
                        <select id="division" className="w-full mt-1 p-2 pr-8 bg-brand-primary text-white font-semibold rounded cursor-pointer appearance-none" style={selectArrowStyle}>
                            <option>Primera A</option>
                            <option>Primera B</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="season" className="text-xs font-semibold text-gray-600 uppercase">TEMPORADA</label>
                        <select id="season" className="w-full mt-1 p-2 pr-8 bg-brand-primary text-white font-semibold rounded cursor-pointer appearance-none" style={selectArrowStyle}>
                            <option>Clausura 2024</option>
                            <option>Apertura 2024</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-2 text-right text-sm text-gray-500">
                        Refleja partidos hasta: 23/09/2024
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-y-2.5 text-center">
                            <thead className="bg-brand-primary text-white">
                                <tr>
                                    <th colSpan="2" className="p-3 text-left font-semibold uppercase text-sm rounded-l-md">{columnHeaders.team}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.points}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.gp}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.w}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.l}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.t}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.gf}</th>
                                    <th className="p-3 font-semibold uppercase text-sm">{columnHeaders.ga}</th>
                                    <th className="p-3 font-semibold uppercase text-sm rounded-r-md">{columnHeaders.gd}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="10" className="p-8 text-center text-gray-500">Cargando...</td></tr>
                                ) : (
                                    standings.map((team) => (
                                        <tr key={team.id} className="bg-brand-secondary">
                                            <td className="p-4 text-left font-bold w-12 relative">
                                                <div className={`absolute left-0 top-0 h-full w-1.5 ${rankColors[team.rank] || ''}`}></div>
                                                <span className="ml-4">{team.rank}</span>
                                            </td>
                                            <td className="p-4 text-left font-semibold text-gray-800">{team.name}</td>
                                            <td className="p-4 font-bold text-gray-800">{team.points}</td>
                                            <td className="p-4 text-gray-700">{team.gp}</td>
                                            <td className="p-4 text-gray-700">{team.w}</td>
                                            <td className="p-4 text-gray-700">{team.l}</td>
                                            <td className="p-4 text-gray-700">{team.t}</td>
                                            <td className="p-4 text-gray-700">{team.gf}</td>
                                            <td className="p-4 text-gray-700">{team.ga}</td>
                                            <td className="p-4 text-gray-700 font-medium">{team.gd}</td>
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

export default LeagueStandings;