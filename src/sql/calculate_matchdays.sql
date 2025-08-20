CREATE OR REPLACE FUNCTION calculate_matchdays(team_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF team_count <= 1 THEN
        RETURN 0;
    END IF;
    
    IF team_count % 2 = 0 THEN
        -- Even number of teams: N-1 matchdays
        RETURN team_count - 1;
    ELSE
        -- Odd number of teams: N matchdays
        RETURN team_count;
    END IF;
END;
$$;
