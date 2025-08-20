export interface Team {
    ID: number;
    NOMBRE: string;
    CHAPA: string;
    TIPO: TeamType;
}

export const TeamType = {
    MASCULINO: 'MASCULINO',
    FEMENINO: 'FEMENINO',
    MIXTO: 'MIXTO'
} as const;

export type TeamType = typeof TeamType[keyof typeof TeamType];

export interface GroupConfig {
    ID: number;
    NOMBRE: string;
    EQUIPOS: Team[];
}

export interface RoundWithGroups {
    ID: number;
    NOMBRE: string;
    GRUPOS: GroupConfig[];
}

export interface TeamAssignment {
    ID_GRUPO: number;
    equipo: Team | null;
}

export interface TeamWithGroup {
    ID_EQUIPO: number;
    equipo: Team;
}

export interface TeamSelectorState {
    teams: Team[];
    groups: GroupConfig[];
    rounds: RoundWithGroups[];
    selectedRoundId: number | null;
    selectedTeams: Record<number, number>;
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;
}
