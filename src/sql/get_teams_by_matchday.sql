CREATE OR REPLACE FUNCTION get_teams_by_matchday(
    competition_id INTEGER,
    matchday TEXT
)
RETURNS TABLE (
    "ID" INTEGER,
    "NOMBRE" TEXT,
    "CHAPA" TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        E."ID",
        E."NOMBRE",
        E."CHAPA"
    FROM equipo E
    INNER JOIN equipo_grupo EG ON E."ID" = EG."ID_EQUIPO"
    INNER JOIN grupo G ON EG."ID_GRUPO" = G."ID"
    INNER JOIN ronda R ON G."ID_RONDA" = R."ID"
    WHERE R."ID_CAMPEONATO" = competition_id
    AND G."NOMBRE" = matchday
    ORDER BY E."NOMBRE";
END;
$$;
