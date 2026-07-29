import { useParams } from 'react-router-dom';
import LeagueStandings from './LeagueStandings';
import Matches from './Matches';
import TopScorers from './TopScorers';

export const EmbedPage = () => {
  const { type } = useParams<{ type: string }>();

  const renderContent = () => {
    switch (type) {
      case 'standings':
        return <LeagueStandings />;
      case 'matches':
        return <Matches />;
      case 'top-scorers':
        return <TopScorers />;
      default:
        return <div>Invalid embed type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
    </div>
  );
};

export default EmbedPage;
