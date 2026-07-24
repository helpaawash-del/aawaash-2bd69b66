DO $$
DECLARE
  v_project_id uuid;
  v_building_id uuid;
  v_floor_id uuid;
  v_floor int;
  v_unit int;
  v_unit_code text;
BEGIN
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM public.projects WHERE slug = 'savitri-enclave') THEN
    RETURN;
  END IF;

  INSERT INTO public.projects (
    name, slug, location, address, project_type, construction_status,
    visibility, status, price_from, price_min, price_max,
    total_units, total_buildings, total_floors, total_flats,
    available_flats, reserved_flats, sold_flats,
    tag, short_description, description, hero_hue, display_priority,
    completion_percent, amenities
  ) VALUES (
    'Savitri Enclave',
    'savitri-enclave',
    'Near JP Chowk, Bhagwan Das Mohalla, Darbhanga',
    'Near JP Chowk, Bhagwan Das Mohalla, Darbhanga, Bihar',
    'entire_building',
    'under_construction',
    'public', 'live',
    0, 0, 0,
    20, 1, 4, 20,
    20, 0, 0,
    'New Launch',
    'Unveil a new chapter of refined living.',
    'Premium 3 BHK residences by S.B.P. Buildcon Pvt. Ltd. — 5 unit types across 4 floors, dual vertical circulation cores, earthquake-resistant RCC frame and automatic Kone/Johnson elevator.',
    'from-primary/30 to-leaf/25',
    100, 25,
    ARRAY['Automatic Elevator','Covered Parking','24x7 Security','Power Backup','Perimeter Greenery','RCC Earthquake-resistant Frame']
  ) RETURNING id INTO v_project_id;

  INSERT INTO public.buildings (project_id, code, name, description, total_floors, total_flats, ordering)
  VALUES (v_project_id, 'A', 'Tower A', 'Main residential tower — Lobby A & B cores', 4, 20, 1)
  RETURNING id INTO v_building_id;

  FOR v_floor IN 1..4 LOOP
    INSERT INTO public.floors (building_id, project_id, number, name, total_flats, ordering)
    VALUES (v_building_id, v_project_id, v_floor, 'Floor ' || v_floor, 5, v_floor)
    RETURNING id INTO v_floor_id;

    FOR v_unit IN 1..5 LOOP
      v_unit_code := (v_floor * 100 + v_unit)::text;
      INSERT INTO public.flats (
        project_id, building_id, floor_id, unit_code,
        area_sqft, bedrooms, bathrooms, balconies,
        configuration, facing, status, booking_status, construction_stage
      ) VALUES (
        v_project_id, v_building_id, v_floor_id, v_unit_code,
        CASE v_unit WHEN 1 THEN 2016 WHEN 2 THEN 1821 WHEN 3 THEN 1894 WHEN 4 THEN 1782 ELSE 1763 END,
        3, 3,
        CASE WHEN v_unit IN (1,3,5) THEN 4 ELSE 3 END,
        '3 BHK · Drawing + Dining · Kitchen',
        CASE v_unit WHEN 1 THEN 'East' WHEN 2 THEN 'North-East' WHEN 3 THEN 'North' WHEN 4 THEN 'North-West' ELSE 'West' END,
        'available', 'open', 'under_construction'
      );
    END LOOP;
  END LOOP;
END $$;
