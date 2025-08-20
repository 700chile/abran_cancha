export const STANDINGS_QUERY = `WITH T AS (SELECT "EQ_LOCAL" AS EQ ,
		CASE WHEN goles_local IS NULL AND goles_visita IS NULL THEN NULL
			WHEN goles_local > goles_visita THEN 'W'
			WHEN goles_local < goles_visita THEN 'L' ELSE 'D' END RESULT ,
			goles_local AS goles_favor ,
			goles_visita AS goles_contra
	FROM partido P

	UNION ALL

	SELECT "EQ_VISITA" ,
		CASE WHEN goles_local IS NULL AND goles_visita IS NULL THEN NULL
			WHEN goles_local < goles_visita THEN 'W'
			WHEN goles_local > goles_visita THEN 'L' ELSE 'D' END ,
			goles_visita ,
			goles_local
	FROM partido P),

TA AS (SELECT EQ CLUB , (select COUNT(*) FROM T T2 WHERE RESULT IS NOT NULL AND T2.EQ = T.EQ) PJ
	, (select COUNT(*) FROM T T2 WHERE RESULT = 'W' AND T2.EQ = T.EQ) PG
	, (select COUNT(*) FROM T T2 WHERE RESULT = 'D' AND T2.EQ = T.EQ) PE
	, (select COUNT(*) FROM T T2 WHERE RESULT = 'L' AND T2.EQ = T.EQ) PP
	, SUM(goles_favor) GF
	, SUM(goles_contra) GC
	, (select SUM(goles_favor) - SUM(goles_contra) FROM T T2 WHERE T2.EQ = T.EQ) DIF
FROM T
GROUP BY 1
ORDER BY 7 DESC , 5 DESC , 6 ASC),

TAB AS (SELECT E."NOMBRE" , TA.PJ , TA.PG , TA.PE , TA.PP , TA.GF , TA.GC , TA.DIF ,
	CASE WHEN CLUB = 16 THEN 3*PG + 1*PE - 3 WHEN CLUB = 26 THEN 3*PG + 1*PE - 6 ELSE 3*PG + 1*PE END PTS
FROM TA , equipo_grupo G , equipo E
WHERE E."ID" = G."ID_EQUIPO"
AND G."ID" = TA.CLUB
AND "ID_GRUPO" = 2)

SELECT RANK() OVER (ORDER BY PTS DESC , DIF DESC , GC DESC) POS , "NOMBRE" , PJ , PG , PE , PP , DIF , PTS
FROM TAB`;