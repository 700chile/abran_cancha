CREATE OR REPLACE FUNCTION get_teams(team_type TEXT)
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
        "ID",
        "NOMBRE",
        "CHAPA"
    FROM equipo
    WHERE "TIPO" = team_type
    ORDER BY "NOMBRE";
END;
$$;
