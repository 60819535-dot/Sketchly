import { supabase } from './supabase.js';

async function probarConexion() {
  const { error } = await supabase
    .from('designs')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error de conexión o permisos:', error.message);
    return;
  }

  console.log('Conexión con Supabase correcta.');
}

probarConexion();
