
import { createClient } from
  'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'PEGA_AQUI_TU_PROJECT_URL';
const SUPABASE_KEY = 'PEGA_AQUI_TU_PUBLISHABLE_KEY';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
