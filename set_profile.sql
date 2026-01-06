insert into profiles (id, email, full_name, role, active_outlet_id, allowed_outlet_ids, is_active)
values (
  '6fce0ecb-b0dc-4666-a10f-022f8466c600',
  'papagoyal978@gmail.com',
  'Admin',
  'admin',
  '2978dfe6-efc7-4c92-ac6a-565b8a9830b0',
  ARRAY['2978dfe6-efc7-4c92-ac6a-565b8a9830b0']::uuid[],
  true
)
on conflict (id) do update set
  active_outlet_id = excluded.active_outlet_id,
  allowed_outlet_ids = excluded.allowed_outlet_ids,
  role = excluded.role;
