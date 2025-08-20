export interface MatchdayObj {
    fecha: string;
}

export interface Match {
    ID: number;
    ID_PARTIDO: number;  // Added for nomina table
    equipo_local: string;
    equipo_visita: string;
    goles_local: number | null;
    goles_visita: number | null;
    RECINTO: string;
    PROGRAMACION: string;
}

export const COMPETITION_TYPES = [
    'LIGA LOCAL',
    'COPA LOCAL',
    'COPA CLUBES FEDERACION',
    'COPA SELECCIONES FEDERACION',
    'COPA MUNDIAL'
] as const;

export type CompetitionType = typeof COMPETITION_TYPES[number];

export const ROUND_TYPES = [
    'TODOS CONTRA TODOS',
    'ELIMINACIÓN DIRECTA'
] as const;

export const ROUND_VUELTAS = [
    'UNA VUELTA',
    'IDA Y VUELTA',
    'FINAL ÚNICA'
] as const;

export type RoundType = typeof ROUND_TYPES[number];
export type RoundVueltas = typeof ROUND_VUELTAS[number];

export const TEAM_TYPES = [
    'CLUB',
    'SELECCION_NACIONAL'
] as const;

export type TeamType = typeof TEAM_TYPES[number];

export interface Team {
    ID: number;
    NOMBRE: string;
    CHAPA?: string;
    TIPO?: TeamType;
}

export interface Competition {
    NOMBRE: string;
    EDICION: string;
    RONDAS_CANT: number;
    EQUIPOS_CANT: number;
    TIPO: CompetitionType;
    MARCA: string;
    ID?: number; // Add ID for existing competitions
}

export interface RoundConfig {
    TIPO: RoundType;
    VUELTAS: RoundVueltas;
    GRUPOS_CANT: number;
    NOMBRE: string; // Add NOMBRE for round
    GRUPOS: GroupConfig[];
    ID?: number; // Add ID for existing rounds
}

export interface TeamWithGroup {
    ID_EQUIPO: number;
    equipo: Team;
}

export interface GroupConfig {
    ID: number;
    NOMBRE: string;
    EQUIPOS_CANT: number;
    EQUIPOS: TeamWithGroup[];
}

export interface CompetitionFormState {
    competition: Competition;
    rounds: RoundConfig[];
}

export interface TeamSelectorState {
    teams: Team[];
    groups: GroupConfig[];
    selectedTeams: { [key: number]: boolean };
    firstRoundId: number | null;
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;
}
