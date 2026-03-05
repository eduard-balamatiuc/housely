-- Seed educat.md 2025 school rankings (BAC exam results)
-- Source: https://educat.md/top-licee-chisinau-2025

INSERT INTO school_rankings (educat_rank, educat_name, sector) VALUES
  (1, 'Liceul Teoretic "Spiru Haret"', 'Buiucani'),
  (2, 'Liceul de Creativitate și Inventică "Prometeu-Prim"', 'Buiucani'),
  (3, 'Liceul Teoretic "Dante Alighieri"', 'Centru'),
  (4, 'Liceul Teoretic "Gheorghe Asachi"', 'Buiucani'),
  (5, 'Liceul Teoretic "Mihai Eminescu"', 'Centru'),
  (6, 'Liceul Teoretic "Natalia Gheorghiu"', 'Centru'),
  (7, 'Liceul Teoretic "Nicolae Iorga"', 'Botanica'),
  (8, 'Liceul Teoretic "Mihail Sadoveanu"', 'Ciocana'),
  (9, 'Liceul Teoretic "Lucian Blaga"', 'Centru'),
  (10, 'Liceul Teoretic "Ion Creangă"', 'Buiucani'),
  (11, 'Liceul Teoretic "Vasile Alecsandri"', 'Centru'),
  (12, 'Liceul Teoretic "Miguel de Cervantes Saavedra"', 'Centru'),
  (13, 'Liceul Teoretic "Gaudeamus"', 'Botanica'),
  (14, 'Liceul Teoretic "Academician C. Sibirschi"', 'Buiucani'),
  (15, 'Liceul Teoretic "Petru Movilă"', 'Ciocana'),
  (16, 'Liceul Teoretic "Constantin Stere"', 'Centru'),
  (17, 'Liceul Teoretic "Mircea Eliade"', 'Botanica'),
  (18, 'Liceul Teoretic "Hyperion"', 'Botanica'),
  (19, 'Liceul Teoretic "Pro Succes"', 'Rîșcani'),
  (20, 'Liceul Teoretic "Principesa Natalia Dadiani"', 'Rîșcani'),
  (21, 'Liceul Teoretic "Liviu Deleanu"', 'Ciocana'),
  (22, 'Liceul Teoretic "Alexandru cel Bun"', 'Botanica'),
  (23, 'Liceul Teoretic "Dimitrie Cantemir"', 'Rîșcani'),
  (24, 'Liceul Teoretic "Ion Luca Caragiale"', 'Buiucani'),
  (25, 'Liceul Teoretic "Socrate"', 'Rîșcani'),
  (26, 'Liceul Teoretic "Tudor Vladimirescu"', 'Ciocana')
ON CONFLICT (educat_rank) DO NOTHING;

-- Auto-match to OSM amenities using pg_trgm similarity
UPDATE school_rankings sr
SET amenity_id = best.aid, matched_name = best.aname, match_confidence = best.sim
FROM (
  SELECT DISTINCT ON (sr2.id)
    sr2.id AS rid, a.id AS aid, a.name AS aname,
    similarity(lower(sr2.educat_name), lower(a.name)) AS sim
  FROM school_rankings sr2
  CROSS JOIN amenities a
  WHERE a.category = 'schools'
    AND similarity(lower(sr2.educat_name), lower(a.name)) > 0.25
  ORDER BY sr2.id, sim DESC
) best
WHERE sr.id = best.rid;
