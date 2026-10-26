
import { supabase } from './supabase.js';

// REGISTRAR CLIENTE
export async function registrarCliente(nombre, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: nombre },
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

// INICIAR SESIÓN
export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// CERRAR SESIÓN
export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// OBTENER USUARIO ACTUAL
export async function obtenerUsuario() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// CREAR PEDIDO
export async function crearPedido({
  titulo,
  descripcion,
  presupuesto = null,
  designId = null
}) {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    throw new Error('Inicia sesión antes de solicitar un diseño.');
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: usuario.id,
      title: titulo,
      description: descripcion,
      budget: presupuesto,
      design_id: designId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// CONSULTAR MIS PEDIDOS
export async function consultarMisPedidos() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// CONSULTAR PORTAFOLIO PÚBLICO
export async function consultarDisenos() {
  const { data, error } = await supabase
    .from('designs')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// SUBIR REFERENCIA A STORAGE
export async function subirReferencia(orderId, archivo) {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    throw new Error('Debes iniciar sesión.');
  }

  if (!archivo) {
    throw new Error('Selecciona un archivo.');
  }

  const permitidos = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  if (!permitidos.includes(archivo.type)) {
    throw new Error('Solo se permiten JPG, PNG, WEBP o PDF.');
  }

  if (archivo.size > 10 * 1024 * 1024) {
    throw new Error('El archivo no puede superar los 10 MB.');
  }

  const extension = archivo.name.split('.').pop().toLowerCase();
  const ruta = `${usuario.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('sketchly-files')
    .upload(ruta, archivo, { upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('order_files')
    .insert({
      order_id: orderId,
      user_id: usuario.id,
      file_path: ruta,
      file_type: 'reference'
    })
    .select()
    .single();

  if (error) {
    // Limpieza si no se pudo registrar la referencia.
    await supabase.storage.from('sketchly-files').remove([ruta]);
    throw error;
  }

  return data;
}

// OBTENER ENLACE TEMPORAL DE UN ARCHIVO
export async function obtenerEnlaceTemporal(ruta) {
  const { data, error } = await supabase.storage
    .from('sketchly-files')
    .createSignedUrl(ruta, 60);

  if (error) throw error;
  return data.signedUrl;
}

// REGISTRAR UN PAGO PENDIENTE
export async function registrarPago(orderId, importe, metodo, comprobante = null) {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    throw new Error('Debes iniciar sesión.');
  }

  let rutaComprobante = null;

  if (comprobante) {
    const permitidos = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!permitidos.includes(comprobante.type)) {
      throw new Error('El comprobante debe ser JPG, PNG o PDF.');
    }

    if (comprobante.size > 10 * 1024 * 1024) {
      throw new Error('El comprobante no puede superar los 10 MB.');
    }

    const extension = comprobante.name.split('.').pop().toLowerCase();
    rutaComprobante =
      `${usuario.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from('sketchly-files')
      .upload(rutaComprobante, comprobante);

    if (error) throw error;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      user_id: usuario.id,
      amount: importe,
      method: metodo,
      receipt_path: rutaComprobante,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ESCUCHAR CAMBIOS DE SESIÓN
export function escucharSesion(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

