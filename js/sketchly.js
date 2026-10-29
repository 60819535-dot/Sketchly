
import { supabase } from './supabase.js';

// ==========================================
// REGISTRO DE CLIENTES
// ==========================================
export async function registrarCliente(nombre, email, password) {
    const nombreLimpio = nombre.trim();
    const correoLimpio = email.trim().toLowerCase();

    if (!nombreLimpio || !correoLimpio || !password) {
        throw new Error('Completa todos los campos.');
    }

    if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }

    // Envía la confirmación de vuelta a la página pública de Sketchly,
    // nunca al localhost de desarrollo cuando se usa el sitio publicado.
    const urlConfirmacion = new URL('./login.html', window.location.href);
    urlConfirmacion.search = '';
    urlConfirmacion.hash = '';

    const { data, error } = await supabase.auth.signUp({
        email: correoLimpio,
        password,
        options: {
            emailRedirectTo: urlConfirmacion.toString(),
            data: {
                full_name: nombreLimpio
            }
        }
    });

    if (error) {
        throw error;
    }

    return data;
}

// ==========================================
// INICIO DE SESIÓN
// ==========================================
export async function iniciarSesion(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
    });

    if (error) {
        throw error;
    }

    return data;
}

// ==========================================
// CERRAR SESIÓN
// ==========================================
export async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }
}

// ==========================================
// OBTENER USUARIO ACTUAL
// ==========================================
export async function obtenerUsuario() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    return data.user;
}

// ==========================================
// ESCUCHAR CAMBIOS DE SESIÓN
// ==========================================
export function escucharSesion(callback) {
    const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
            callback(session?.user ?? null, event);
        }
    );

    return data.subscription;
}

// ==========================================
// CREAR SOLICITUD DE DISEÑO
// ==========================================
export async function crearPedido({
    nombre,
    correo,
    tipo,
    descripcion,
    fecha,
    archivo = null
}) {
    const usuario = await obtenerUsuario();

    if (!usuario) {
        throw new Error(
            'Debes iniciar sesión para enviar una solicitud.'
        );
    }

    if (!nombre?.trim() || !correo?.trim() || !tipo ||
        !descripcion?.trim() || !fecha) {
        throw new Error('Completa todos los campos obligatorios.');
    }

    if (correo.trim().toLowerCase() !== usuario.email?.toLowerCase()) {
        throw new Error('El correo no coincide con tu cuenta.');
    }

    let rutaImagen = null;

    // La imagen de referencia es opcional.
    if (archivo) {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif'
        ];

        if (!tiposPermitidos.includes(archivo.type)) {
            throw new Error('La imagen debe ser JPG, PNG, WEBP o GIF.');
        }

        if (archivo.size > 10 * 1024 * 1024) {
            throw new Error('La imagen no puede superar los 10 MB.');
        }

        const extension = archivo.name.split('.').pop().toLowerCase();

        // La ruta comienza con el ID del usuario para aplicar RLS.
        rutaImagen = `${usuario.id}/${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
            .from('sketchly-files')
            .upload(rutaImagen, archivo, {
                upsert: false,
                contentType: archivo.type
            });

        if (errorSubida) {
            throw errorSubida;
        }
    }

    const { data, error } = await supabase
        .from('orders')
        .insert({
            user_id: usuario.id,
            title: `Solicitud: ${tipo}`,
            description: descripcion.trim(),
            customer_name: nombre.trim(),
            customer_email: usuario.email,
            design_type: tipo,
            due_date: fecha,
            reference_path: rutaImagen,
            status: 'pending'
        })
        .select()
        .single();

    // Si falla el registro, intenta eliminar la imagen subida.
    if (error) {
        if (rutaImagen) {
            const { error: errorLimpieza } = await supabase.storage
                .from('sketchly-files')
                .remove([rutaImagen]);

            if (errorLimpieza) {
                console.error('Error al limpiar la imagen:', errorLimpieza);
            }
        }

        throw error;
    }

    return data;
}

// ==========================================
// CONSULTAR SOLICITUDES DEL CLIENTE
// ==========================================
export async function consultarMisPedidos() {
    const usuario = await obtenerUsuario();

    if (!usuario) {
        throw new Error('Debes iniciar sesión.');
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', usuario.id)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data;
}

// ==========================================
// OBTENER ENLACE TEMPORAL DE UNA IMAGEN
// ==========================================
export async function obtenerEnlaceTemporal(ruta) {
    if (!ruta) {
        return null;
    }

    const usuario = await obtenerUsuario();

    if (!usuario || !ruta.startsWith(`${usuario.id}/`)) {
        throw new Error('No tienes permiso para consultar este archivo.');
    }

    const { data, error } = await supabase.storage
        .from('sketchly-files')
        .createSignedUrl(ruta, 300);

    if (error) {
        throw error;
    }

    return data.signedUrl;
}
