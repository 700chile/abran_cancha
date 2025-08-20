import React, { useState } from 'react';
import type {
    Team
} from '../types';

import { TEAM_TYPES } from '../types';
import { createTeam } from '../lib/api';

const TeamCreator: React.FC = () => {
    const [formData, setFormData] = useState<Omit<Team, 'ID'> & { ID?: number }>({
        NOMBRE: '',
        CHAPA: '',
        TIPO: TEAM_TYPES[0]
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showError, setShowError] = useState(false);

    const handleInputChange = (field: keyof Team) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const createdTeam = await createTeam(formData);
            console.log('Team created successfully:', createdTeam);
            // Reset form after successful submission
            setFormData({
                NOMBRE: '',
                CHAPA: '',
                TIPO: TEAM_TYPES[0]
            });
            setSuccessMessage(`Equipo ${createdTeam.NOMBRE} creado exitosamente!`);
            setShowSuccess(true);
            // Hide success message after 3 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('Error creating team:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Error creating team. Please try again.');
            setShowError(true);
            // Hide error message after 3 seconds
            setTimeout(() => {
                setShowError(false);
            }, 3000);
        }
    };

    return (
        <div className="team-creator">
            <h2>Crear Nuevo Equipo</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-group">
                    <label htmlFor="nombre">Nombre:</label>
                    <input
                        type="text"
                        id="nombre"
                        value={formData.NOMBRE}
                        onChange={handleInputChange('NOMBRE')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="chapa">Chapa:</label>
                    <input
                        type="text"
                        id="chapa"
                        value={formData.CHAPA}
                        onChange={handleInputChange('CHAPA')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="tipo">Tipo:</label>
                    <select
                        id="tipo"
                        value={formData.TIPO}
                        onChange={handleInputChange('TIPO')}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    >
                        <option value="">Seleccione un tipo</option>
                        {TEAM_TYPES.map(type => (
                            <option key={type} value={type}>
                                {type === 'CLUB' ? 'Club' : 'Selección Nacional'}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                    Crear Equipo
                </button>

                {showSuccess && (
                    <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
                        {successMessage}
                    </div>
                )}
                {showError && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        {errorMessage}
                    </div>
                )}
            </form>
        </div>
    );
};

export default TeamCreator;
