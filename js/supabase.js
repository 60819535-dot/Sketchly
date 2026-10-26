
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuración de Supabase
const SUPABASE_URL = 'PEGA_AQUI_LA_URL_DE_TU_PROYECTO';

const SUPABASE_KEY = 'sb_publishable_qt1ClDPPKUwpHK52QOp8eQ_TxxI2RcM';

// Crear conexión
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
