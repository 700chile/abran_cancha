CREATE OR REPLACE FUNCTION create_competition(
    competition_data JSONB,
    rounds_data TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    competition_id INTEGER;
    round_id INTEGER;
    round_index INTEGER := 0;
    v_round JSONB;
    v_group JSONB;
BEGIN
    -- Start a transaction
    BEGIN
        -- Insert competition
        INSERT INTO campeonato (
            "NOMBRE",
            "EDICION",
            "RONDAS_CANT",
            "EQUIPOS_CANT",
            "TIPO",
            "MARCA"
        ) VALUES (
            competition_data->>'NOMBRE',
            (competition_data->>'EDICION')::INTEGER,
            (competition_data->>'RONDAS_CANT')::INTEGER,
            (competition_data->>'EQUIPOS_CANT')::INTEGER,
            competition_data->>'TIPO',
            competition_data->>'MARCA'
        ) RETURNING "ID" INTO competition_id;

        -- Insert rounds
        FOR v_round IN SELECT jsonb_array_elements(rounds_data::json::jsonb)
        LOOP
            INSERT INTO ronda (
                "ID_CAMPEONATO",
                "NOMBRE",
                "GRUPOS_CANT"
            ) VALUES (
                competition_id,
                v_round->>'NOMBRE',
                (v_round->>'GRUPOS_CANT')::INTEGER
            ) RETURNING "ID" INTO round_id;

            -- Insert groups for this round
            FOR v_group IN SELECT jsonb_array_elements((v_round->'GRUPOS')::json::jsonb)
            LOOP
                INSERT INTO grupo (
                    "ID_RONDA",
                    "NOMBRE",
                    "EQUIPOS_CANT",
                    "TIPO",
                    "VUELTAS"
                ) VALUES (
                    round_id,
                    v_group->>'NOMBRE',
                    (v_group->>'EQUIPOS_CANT')::INTEGER,
                    CASE 
                        WHEN v_round->>'TIPO' = 'TODOS CONTRA TODOS' THEN 'TODOS CONTRA TODOS'::text
                        WHEN v_round->>'TIPO' = 'ELIMINACIÓN DIRECTA' THEN 'ELIMINACION DIRECTA'::text
                        ELSE 'TODOS CONTRA TODOS'::text
                    END,
                    v_round->>'VUELTAS'
                );
            END LOOP;

            round_index := round_index + 1;
        END LOOP;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction on error
            RAISE EXCEPTION 'Error creating competition: %', SQLERRM;
    END;
END;
$$;
