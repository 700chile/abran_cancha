CREATE OR REPLACE FUNCTION create_matches(
    competition_id INTEGER,
    match_assignments JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match JSONB;
    group_id INTEGER;
    matchday INTEGER;
    home_team INTEGER;
    away_team INTEGER;
BEGIN
    -- Start a transaction
    BEGIN
        -- Delete existing matches for this competition
        DELETE FROM partido WHERE "ID_GRUPO" IN (
            SELECT "ID" FROM grupo WHERE "ID_RONDA" IN (
                SELECT "ID" FROM ronda WHERE "ID_CAMPEONATO" = competition_id
            )
        );

        -- Insert new matches
        FOR v_match IN SELECT jsonb_array_elements(match_assignments)
        LOOP
            group_id := (v_match->>'group_id')::INTEGER;
            matchday := (v_match->>'matchday')::INTEGER;
            home_team := (v_match->>'home_team')::INTEGER;
            away_team := (v_match->>'away_team')::INTEGER;

            INSERT INTO partido (
                "ID_GRUPO",
                "FECHA",
                "ID_EQUIPO_LOCAL",
                "ID_EQUIPO_VISITA"
            ) VALUES (
                group_id,
                format('Matchday %s', matchday),
                home_team,
                away_team
            );
        END LOOP;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction on error
            RAISE EXCEPTION 'Error creating matches: %', SQLERRM;
    END;
END;
$$;
