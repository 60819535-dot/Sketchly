
import { supabase } from './supabase.js';

// Comprobar que la sesión corresponde a un administrador.
async function exigirAdmin() {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error('Debes iniciar sesión.');
  }

  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single();

  if (error) throw error;
  if (perfil.role !== 'admin') {
    throw new Error('No tienes permisos de administrador.');
  }

  return auth.user;
}

// Ver todos los pedidos.
export async function listarTodosLosPedidos() {
  await exigirAdmin();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Actualizar estado de un pedido.
export async function actualizarEstadoPedido(id, estado) {
  await exigirAdmin();

  const estadosPermitidos = [
    'pending', 'reviewing', 'quoted',
    'in_progress', 'completed', 'cancelled'
  ];

  if (!estadosPermitidos.includes(estado)) {
    throw new Error('Estado no válido.');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: estado,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Consultar todos los pagos.
export async function listarPagos() {
  await exigirAdmin();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Aprobar o rechazar un pago.
export async function verificarPago(id, estado) {
  await exigirAdmin();

  if (!['approved', 'rejected'].includes(estado)) {
    throw new Error('Estado de pago no válido.');
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status: estado })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Entregar un archivo al cliente.
export async function entregarDiseno(orderId, archivo, userId) {
  await exigirAdmin();

  if (!archivo || !userId) {
    throw new Error('Falta el archivo o el usuario.');
  }

  if (archivo.size > 20 * 1024 * 1024) {
    throw new Error('El archivo supera los 20 MB.');
  }

  const extension = archivo.name.split('.').pop().toLowerCase();
  const ruta = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('sketchly-files')
    .upload(ruta, archivo);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('order_files')
    .insert({
      order_id: orderId,
      user_id: userId,
      file_path: ruta,
      file_type: 'delivery'
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('sketchly-files').remove([ruta]);
    throw error;
  }

  return data;
}

// Crear o editar un diseño del portafolio.
export async function guardarDiseno(diseno) {
  await exigirAdmin();

  const { data, error } = await supabase
    .from('designs')
    .insert({
      title: diseno.title,
      description: diseno.description || '',
      category: diseno.category || 'General',
      image_url: diseno.image_url || null,
      price: diseno.price ?? null,
      is_published: Boolean(diseno.is_published)
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

