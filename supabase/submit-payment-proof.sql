-- Registra el comprobante sin permitir que el cliente cambie el precio o el estado del pedido.
-- Ejecutar una sola vez en Supabase > SQL Editor.

CREATE OR REPLACE FUNCTION public.submit_payment_proof(
    p_order_id text,
    p_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_updated boolean := false;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para enviar el comprobante.';
    END IF;

    IF p_path IS NULL
       OR (storage.foldername(p_path))[1] <> v_user_id::text
       OR (storage.foldername(p_path))[2] <> p_order_id THEN
        RAISE EXCEPTION 'La ruta del comprobante no corresponde a tu cuenta y pedido.';
    END IF;

    UPDATE public.orders
       SET payment_proof_path = p_path,
           payment_status = 'submitted'
     WHERE id::text = p_order_id
       AND user_id = v_user_id
       AND status IN ('quoted', 'awaiting_payment', 'in_progress');

    v_updated := FOUND;
    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(text, text) TO authenticated;
