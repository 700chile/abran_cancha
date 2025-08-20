// Types for match creation
export type TournamentType = 'TODOS CONTRA TODOS' | 'ELIMINACION DIRECTA';
export type LegsType = 'UNA VUELTA' | 'IDA Y VUELTA' | 'FINAL UNICA';

export interface Team {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  type: TournamentType;
  legs: LegsType;
  teams: Team[];
  teamsCount: number;
  competitionId: string;
  roundId: string;
}

export interface Match {
  // Internal fields (lowercase)
  id?: string;
  fecha: number; // gameday number (1, 2, 3...)
  programacion: string; // ISO date string
  eq_local: string | null; // team id
  eq_visita: string | null; // team id
  id_competencia: string;
  id_grupo: string;
  id_ronda: string;
  ronda?: string; // gameday name (e.g., "Jornada 1", "FINAL")
  
  // Database fields (uppercase)
  ID?: string;
  FECHA?: number;
  PROGRAMACION?: string;
  EQ_LOCAL?: string | null;
  EQ_VISITA?: string | null;
  ID_COMPETENCIA?: string;
  ID_GRUPO?: string;
  ID_RONDA?: string;
  RONDA?: string;
}

export interface Gameday {
  id: string;
  name: string;
  date: string; // ISO date string
  matches: Match[];
  groupId: string;
  isFirstLeg: boolean;
}
