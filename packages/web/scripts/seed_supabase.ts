import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  console.log(
    'Loaded VITE_ keys:',
    Object.keys(process.env).filter((k) => k.startsWith('VITE_'))
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🌱 Seeding Supabase...');

  // 1. Create Outlet
  const outletId = uuidv4();
  const { error: outletError } = await supabase.from('outlets').insert({
    id: outletId,
    name: 'Cocina Central (PoC)',
    type: 'main_kitchen',
  });

  if (outletError) {
    console.error('Error creating outlet:', outletError);
    return;
  }
  console.log('✅ Outlet created:', outletId);

  // 2. Create Ingredients
  const ingredients = [
    {
      outlet_id: outletId,
      name: 'Tomate Triturado',
      unit: 'kg',
      cost_per_unit: 1.5,
      current_stock: 50,
      min_stock: 10,
    },
    {
      outlet_id: outletId,
      name: 'Aceite de Oliva Virgen Extra',
      unit: 'l',
      cost_per_unit: 9.8,
      current_stock: 120,
      min_stock: 20,
    },
    {
      outlet_id: outletId,
      name: 'Harina de Trigo',
      unit: 'kg',
      cost_per_unit: 0.8,
      current_stock: 200,
      min_stock: 50,
    },
    {
      outlet_id: outletId,
      name: 'Mozzarella Rallada',
      unit: 'kg',
      cost_per_unit: 6.5,
      current_stock: 15,
      min_stock: 5,
    },
  ];

  const { error: ingError } = await supabase.from('ingredients').insert(ingredients);

  if (ingError) {
    console.error('Error creating ingredients:', ingError);
  } else {
    console.log(`✅ ${ingredients.length} ingredients created.`);
    console.log('\n🎉 Seeding complete! You can now test the Hybrid Repository.');
    console.log(`ℹ️  Copy this Outlet ID to use in your tests: ${outletId}`);
  }
}

seed();
