import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id') || '3630'
    const token = Deno.env.get('NUVEMSHOP_ACCESS_TOKEN')!
    const storeId = Deno.env.get('NUVEMSHOP_STORE_ID')!
    const r = await fetch(`https://api.nuvemshop.com.br/v1/${storeId}/orders/${orderId}`, {
      headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'Louder (debug)' },
    })
    const data = await r.json()
    const summary = {
      number: data.number,
      payment_status: data.payment_status,
      payment_details: data.payment_details,
      payment_method: data.payment_method,
      gateway: data.gateway,
      gateway_name: data.gateway_name,
      payment_count: data.payment_count,
      payments: data.payments,
      total: data.total,
      total_paid: data.total_paid,
      payment_keys: Object.keys(data).filter(k => k.toLowerCase().includes('pay') || k.toLowerCase().includes('gateway')),
    }
    return new Response(JSON.stringify({ summary, raw: data }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})