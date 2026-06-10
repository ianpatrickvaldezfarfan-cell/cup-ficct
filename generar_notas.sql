DO $$
DECLARE
    v_postulacion RECORD;
    v_materia RECORD;
    v_nota1 INTEGER;
    v_nota2 INTEGER;
    v_nota3 INTEGER;
    v_aprobado BOOLEAN;
    v_cupos_sistemas INTEGER := 150;
    v_cupos_informatica INTEGER := 150;
    v_cupos_redes INTEGER := 100;
    v_robotica INTEGER := 100;
    v_count_sistemas INTEGER := 0;
    v_count_informatica INTEGER := 0;
    v_count_redes INTEGER := 0;
    v_count_robotica INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO v_count_sistemas
    FROM postulaciones po
    JOIN carreras c ON c.id = po.carrera_asignada_id
    WHERE c.nombre ILIKE '%Sistemas%'
    AND po.estado_admision = 'APROBADO';

    SELECT COUNT(*) INTO v_count_informatica
    FROM postulaciones po
    JOIN carreras c ON c.id = po.carrera_asignada_id
    WHERE (c.nombre ILIKE '%Informatica%' OR c.nombre ILIKE '%Inform%tica%')
    AND po.estado_admision = 'APROBADO';

    SELECT COUNT(*) INTO v_count_redes
    FROM postulaciones po
    JOIN carreras c ON c.id = po.carrera_asignada_id
    WHERE c.nombre ILIKE '%Redes%'
    AND po.estado_admision = 'APROBADO';

    SELECT COUNT(*) INTO v_count_robotica
    FROM postulaciones po
    JOIN carreras c ON c.id = po.carrera_asignada_id
    WHERE (c.nombre ILIKE '%Robot%')
    AND po.estado_admision = 'APROBADO';

    FOR v_postulacion IN
        SELECT po.id, po.carrera_asignada_id, c.nombre as carrera_nombre
        FROM postulaciones po
        JOIN carreras c ON c.id = po.carrera_asignada_id
        WHERE NOT EXISTS (SELECT 1 FROM notas n WHERE n.postulacion_id = po.id)
        ORDER BY RANDOM()
    LOOP
        v_aprobado := FALSE;

        IF v_postulacion.carrera_nombre ILIKE '%Sistemas%'
           AND v_count_sistemas < v_cupos_sistemas THEN
            v_aprobado := TRUE;
            v_count_sistemas := v_count_sistemas + 1;

        ELSIF (v_postulacion.carrera_nombre ILIKE '%Informatica%'
           OR v_postulacion.carrera_nombre ILIKE '%Inform%tica%')
           AND v_count_informatica < v_cupos_informatica THEN
            v_aprobado := TRUE;
            v_count_informatica := v_count_informatica + 1;

        ELSIF v_postulacion.carrera_nombre ILIKE '%Redes%'
           AND v_count_redes < v_cupos_redes THEN
            v_aprobado := TRUE;
            v_count_redes := v_count_redes + 1;

        ELSIF v_postulacion.carrera_nombre ILIKE '%Robot%'
           AND v_count_robotica < v_robotica THEN
            v_aprobado := TRUE;
            v_count_robotica := v_count_robotica + 1;
        END IF;

        FOR v_materia IN
            SELECT id FROM materias ORDER BY id
        LOOP
            IF v_aprobado THEN
                v_nota1 := 60 + floor(random() * 41)::int;
                v_nota2 := 60 + floor(random() * 41)::int;
                v_nota3 := 60 + floor(random() * 41)::int;
            ELSE
                IF random() < 0.5 THEN
                    v_nota1 := 20 + floor(random() * 40)::int;
                    v_nota2 := 20 + floor(random() * 40)::int;
                    v_nota3 := 20 + floor(random() * 40)::int;
                ELSE
                    v_nota1 := 40 + floor(random() * 61)::int;
                    v_nota2 := 40 + floor(random() * 61)::int;
                    v_nota3 := 40 + floor(random() * 61)::int;
                END IF;
            END IF;

            INSERT INTO notas (postulacion_id, materia_id, nota1, nota2, nota3)
            VALUES (v_postulacion.id, v_materia.id, v_nota1, v_nota2, v_nota3)
            ON CONFLICT (postulacion_id, materia_id) DO NOTHING;
        END LOOP;

        IF v_aprobado THEN
            UPDATE postulaciones SET estado_admision = 'APROBADO' WHERE id = v_postulacion.id;
        ELSE
            UPDATE postulaciones SET estado_admision = 'REPROBADO' WHERE id = v_postulacion.id;
        END IF;

    END LOOP;

    RAISE NOTICE 'Completado: Sistemas=%, Informatica=%, Redes=%, Robotica=%',
        v_count_sistemas, v_count_informatica, v_count_redes, v_count_robotica;
END $$;
