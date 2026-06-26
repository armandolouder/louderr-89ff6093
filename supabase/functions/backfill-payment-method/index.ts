const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { getNuvemshopCredentials } from '../_shared/nuvemshop.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { accessToken: token, storeId } = await getNuvemshopCredentials(supabase)

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')

    const { data: orders, error } = await supabase
      .from('nuvemshop_orders')
      .select('id, nuvemshop_order_id')
      .eq('payment_status', 'paid')
      .is('payment_method', null)
      .limit(limit)

    if (error) throw error
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ done: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processed = 0
    let failed = 0
    for (const o of orders) {
      try {
        const r = await fetch(`https://api.nuvemshop.com.br/v1/${storeId}/orders/${o.nuvemshop_order_id}`, {
          headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'Louder (backfill)' },
        })
        if (!r.ok) { failed++; continue }
        const data = await r.json()
        const method = data.payment_details?.method || data.gateway || 'unknown'
        await supabase.from('nuvemshop_orders').update({ payment_method: method }).eq('id', o.id)
        processed++
      } catch {
        failed++
      }
    }

    const { count: remaining } = await supabase
      .from('nuvemshop_orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .is('payment_method', null)

    return new Response(JSON.stringify({ processed, failed, remaining }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})