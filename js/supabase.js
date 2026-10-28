
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://kmzcyahrahimshqxgndi.supabase.co';

const SUPABASE_KEY = 'sb_publishable_qt1ClDPPKUwpHK52QOp8eQ_TxxI2RcM';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
