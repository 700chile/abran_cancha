import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createTeam = async (team: any) => {
    try {
        // First check if team with this name exists
        const { data: existingTeam, error: checkError } = await supabase
            .from('equipo')
            .select()
            .eq('NOMBRE', team.NOMBRE)
            .single();

        if (checkError) throw checkError;
        if (existingTeam) {
            throw new Error(`El equipo ${team.NOMBRE} ya existe`);
        }

        // If team doesn't exist, create it
        const { data, error } = await supabase
            .from('equipo')
            .insert([
                {
                    NOMBRE: team.NOMBRE,
                    CHAPA: team.CHAPA,
                    TIPO: team.TIPO
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error creating team:', error);
        throw error;
    }
};

export const createCompetition = async (competitionData: any, roundsData: string) => {
    try {
        console.log('Received competition data:', competitionData);
        console.log('Received rounds data:', roundsData);

        // First check if competition with this name exists
        const { data: existingCompetitions, error: checkError } = await supabase
            .from('campeonato')
            .select('*')
            .eq('NOMBRE', encodeURIComponent(competitionData.NOMBRE));

        if (checkError) {
            console.error('Error checking competition existence:', checkError);
            throw checkError;
        }

        if (existingCompetitions && existingCompetitions.length > 0) {
            throw new Error(`La competencia ${competitionData.NOMBRE} ya existe`);
        }

        // Create the competition using the SQL function
        const { error: transactionError } = await supabase.rpc('create_competition', {
            competition_data: competitionData,
            rounds_data: roundsData
        });

        if (transactionError) {
            console.error('Error creating competition:', transactionError);
            throw transactionError;
        }
    } catch (error) {
        console.error('Error creating competition:', error);
        throw error;
    }
};
