CREATE OR REPLACE FUNCTION assign_teams_to_groups(
    competition_id INTEGER,
    team_assignments TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assignment JSONB;
    team_id INTEGER;
    group_id INTEGER;
BEGIN
    -- Start a transaction
    BEGIN
        -- Delete existing team assignments for this competition
        DELETE FROM equipo_grupo WHERE "ID_GRUPO" IN (
            SELECT "ID" FROM grupo WHERE "ID_RONDA" IN (
                SELECT "ID" FROM ronda WHERE "ID_CAMPEONATO" = competition_id
            )
        );

        -- Insert new team assignments
        FOR v_assignment IN SELECT jsonb_array_elements(team_assignments::json::jsonb)
        LOOP
            team_id := (v_assignment->>'teamID')::INTEGER;
            group_id := (v_assignment->>'groupID')::INTEGER;

            INSERT INTO equipo_grupo (
                "ID_GRUPO",
                "ID_EQUIPO"
            ) VALUES (
                group_id,
                team_id
            );
        END LOOP;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction on error
            RAISE EXCEPTION 'Error assigning teams: %', SQLERRM;
    END;
END;
$$;
