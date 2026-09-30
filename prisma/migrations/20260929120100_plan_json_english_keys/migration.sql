-- Rename the keys of the stored meal plans (generatedPlan / finalPlan) to English,
-- matching lib/ai/planSchema.ts from plan-v3 on. Only keys change; values (the
-- Spanish plan content) are left untouched.
--
-- The map is global: every Spanish key translates the same way at any depth
-- ("nombre" → "name" in meals, "descripcion" → "description" in options).

CREATE FUNCTION pg_temp.plan_keys_to_english(j jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  key_map CONSTANT jsonb := '{
    "kcalObjetivoDiarias": "dailyKcalTarget",
    "proteinas_g": "protein_g",
    "carbohidratos_g": "carbs_g",
    "grasas_g": "fat_g",
    "comidas": "meals",
    "nombre": "name",
    "horarioSugerido": "suggestedTime",
    "opciones": "options",
    "descripcion": "description",
    "alimentos": "foods",
    "kcalAprox": "approxKcal",
    "recomendacionesGenerales": "generalRecommendations",
    "suplementacion": "supplements",
    "indicacion": "item",
    "momento": "timing",
    "advertencias": "warnings"
  }';
BEGIN
  CASE jsonb_typeof(j)
    WHEN 'object' THEN
      RETURN (
        SELECT COALESCE(
          jsonb_object_agg(COALESCE(key_map ->> e.key, e.key), pg_temp.plan_keys_to_english(e.value)),
          '{}'::jsonb
        )
        FROM jsonb_each(j) AS e
      );
    WHEN 'array' THEN
      RETURN (
        SELECT COALESCE(jsonb_agg(pg_temp.plan_keys_to_english(a.value) ORDER BY a.ord), '[]'::jsonb)
        FROM jsonb_array_elements(j) WITH ORDINALITY AS a(value, ord)
      );
    ELSE
      RETURN j;
  END CASE;
END;
$$;

UPDATE "Consultation"
SET "generatedPlan" = pg_temp.plan_keys_to_english("generatedPlan")
WHERE "generatedPlan" IS NOT NULL AND jsonb_typeof("generatedPlan") <> 'null';

UPDATE "Consultation"
SET "finalPlan" = pg_temp.plan_keys_to_english("finalPlan")
WHERE "finalPlan" IS NOT NULL AND jsonb_typeof("finalPlan") <> 'null';

DROP FUNCTION pg_temp.plan_keys_to_english(jsonb);
