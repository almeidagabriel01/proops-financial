// DENO RUNTIME — not Node.js!
// Stub: marks all transactions as category='outros', category_source='ai'
// Real AI categorization is implemented in Epic 2, Story 2.1

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const { importId, userId } = await req.json();

    if (!importId || !userId) {
      return new Response(
        JSON.stringify({ error: 'importId and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Stub: mark all pending transactions as 'outros' with category_source='ai'
    const { error: txError } = await supabase
      .from('transactions')
      .update({ category: 'outros', category_source: 'ai' })
      .eq('import_id', importId)
      .eq('category_source', 'pending');

    if (txError) {
      console.error('Error updating transactions:', txError);
    }

    // Update import status to 'completed'
    const { error: importError } = await supabase
      .from('imports')
      .update({ status: 'completed' })
      .eq('id', importId);

    if (importError) {
      console.error('Error updating import status:', importError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('categorize-import error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
