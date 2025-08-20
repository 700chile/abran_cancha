export const getTeamLogo = (teamName: string): string => {
    const teamLogos: { [key: string]: string } = {
        'Aranjuez': '/logos/aranjuez.png',
        'Alcalá': '/logos/alcala.png',
        'Alcorcón': '/logos/alcorcon.png',
        'Aranjuez B': '/logos/aranjuez-b.png',
        'Alcalá B': '/logos/alcala-b.png',
        'Alcorcón B': '/logos/alcorcon-b.png',
        // Add more teams as needed
    };

    return teamLogos[teamName] || '/logos/default.png';
};
