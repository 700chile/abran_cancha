// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import type { FC } from 'react';
import LeagueStandings from './components/LeagueStandings';
import TeamSelector from './components/TeamSelector';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { PermissionProvider, usePermissions } from './components/PermissionProvider';
import PermissionGate from './components/PermissionGate';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './components/AuthPage';

// Wrapper component to extract competition and round IDs from URL
const TeamSelectorWrapper: FC = () => {
  const { competitionId, roundId } = useParams<{ competitionId: string; roundId?: string }>();
  return competitionId ? <TeamSelector competitionId={competitionId} roundId={roundId} /> : null;
};
import Matches from './components/Matches';
import TopScorers from './components/TopScorers';
import MatchUpdater from './components/MatchUpdater';
import GoalScorerUpdater from './components/GoalScorerUpdater';
import PlayerRosterManager from './components/PlayerRosterManager';
import CompetitionCreator from './components/CompetitionCreator';
import TeamCreator from './components/TeamCreator';
import CompetitionList from './components/CompetitionList';
import MatchCreator from './components/MatchCreator';
import { RosterManager } from './components/RosterManager';
import CompetitionRoundSelector from './components/CompetitionRoundSelector';
import UserRoleManager from './components/UserRoleManager';
const UserMenu: FC = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="flex items-center space-x-3">
      {user ? (
        <>
          <span className="text-xs text-gray-700">{user.email}</span>
          <button
            onClick={() => signOut()}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <Link 
          to="/login"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Iniciar sesión
        </Link>
      )}
    </div>
  );
};

const ProtectedNavGroups: FC = () => {
  const { user, loading } = useAuth();
  const { has, roleKey, roleId, loading: permLoading } = usePermissions();
  if (loading || permLoading || !user) return null;
  console.log('[RBAC:UI] permissions', {
    roleKey,
    roleId,
    permissions: {
      'matches:update': has('matches:update'),
      'goals:create': has('goals:create'),
      'players:create': has('players:create'),
      'teams:create': has('teams:create'),
      'competitions:create': has('competitions:create'),
      'roster:manage': has('roster:manage'),
      'matches:create': has('matches:create'),
      'teams:select': has('teams:select'),
      'users:create': has('users:create'),
      'permissions:admin': has('permissions:admin'),
      'users:manage': has('users:manage'),
    },
  });
  return (
    <>
      <div className="flex space-x-2">
        <PermissionGate need="matches:update"><Link 
          to="/match-updater"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Actualizar Partidos
        </Link></PermissionGate>
        <PermissionGate need="goals:create"><Link 
          to="/goal-scorers"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Registrar Goles
        </Link></PermissionGate>
        <PermissionGate need="players:create"><Link 
          to="/player-roster"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Ingresar Jugadora
        </Link></PermissionGate>
        <PermissionGate need="teams:create"><Link 
          to="/create-team"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Crear Equipo
        </Link></PermissionGate>
      </div>
      <div className="flex space-x-2">
        <PermissionGate need="competitions:create"><Link 
          to="/create-competition"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Crear Competencia
        </Link></PermissionGate>
        <PermissionGate need="roster:manage"><Link 
          to="/roster-manager"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Ingresar Plantel
        </Link></PermissionGate>
        <PermissionGate need="matches:create"><Link 
          to="/create-matches"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Crear Partidos
        </Link></PermissionGate>
        <PermissionGate need="users:manage"><Link 
          to="/users-roles"
          className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
        >
          Usuarios y Roles
        </Link></PermissionGate>
      </div>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
      <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-md w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-start py-4">
              <div className="flex items-center">
                <Link to="/" className="text-brand-primary font-bold text-xl">
                  Abran Cancha
                </Link>
              </div>
              <div className="flex flex-col ml-8 space-y-2">
                <div className="flex space-x-2">
                  <Link 
                    to="/"
                    className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
                  >
                    Tabla de Posiciones
                  </Link>
                  <Link 
                    to="/matches"
                    className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
                  >
                    Partidos
                  </Link>
                  <Link 
                    to="/top-scorers"
                    className="text-gray-700 hover:text-brand-primary px-2 py-1 rounded-md text-xs font-medium"
                  >
                    Goleadoras
                  </Link>
                </div>
                <ProtectedNavGroups />
              </div>
              <div className="flex items-center">
                <UserMenu />
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 py-6">
          <Routes>
            <Route path="/" element={<LeagueStandings />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/top-scorers" element={<TopScorers />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/match-updater" element={<ProtectedRoute need="matches:update"><MatchUpdater /></ProtectedRoute>} />
            <Route path="/goal-scorers" element={<ProtectedRoute need="goals:create"><GoalScorerUpdater /></ProtectedRoute>} />
            <Route path="/player-roster" element={<ProtectedRoute need="players:create"><PlayerRosterManager /></ProtectedRoute>} />
            <Route path="/create-competition" element={<ProtectedRoute need="competitions:create"><CompetitionCreator /></ProtectedRoute>} />
            <Route path="/roster-manager" element={<ProtectedRoute need="roster:manage"><RosterManager /></ProtectedRoute>} />
            <Route path="/competition" element={<CompetitionList />} />
            <Route path="/competition/:competitionId/round/:roundId/select-teams" element={
              <ProtectedRoute need="matches:create"><TeamSelectorWrapper /></ProtectedRoute>
            } />
            <Route path="/competition/:id/build-matches" element={<ProtectedRoute need="matches:create"><MatchCreator /></ProtectedRoute>} />
            <Route path="/create-matches" element={<ProtectedRoute need="matches:create"><CompetitionRoundSelector /></ProtectedRoute>} />
            <Route path="/create-team" element={<ProtectedRoute need="teams:create"><TeamCreator /></ProtectedRoute>} />
            <Route path="/users-roles" element={<ProtectedRoute need="users:manage"><UserRoleManager /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
      </Router>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;