const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { getNuvemshopCredentials } from '../_shared/nuvemshop.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { orderId } = await req.json()
    if (!orderId) throw new Error('orderId é obrigatório')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { accessToken: token, storeId } = await getNuvemshopCredentials(supabase)

    const r = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`, {
      headers: {
        'Authentication': `bearer ${token}`,
        'User-Agent': 'LOUDER.ink (allvisualweb@gmail.com)',
        'Content-Type': 'application/json',
      },
    })
    if (!r.ok) {
      const t = await r.text()
      throw new Error(`Nuvemshop API error: ${r.status} - ${t}`)
    }
    const o = await r.json()
    const addr = o.shipping_address || o.billing_address || {}
    const coupons = (o.coupon || []).map((c: any) => c?.code).filter(Boolean)
    const gatewayName = o.gateway_name || o.gateway || null
    const shippingName = o.shipping_option || o.shipping || null

    const details = {
      number: o.number,
      customer_name: o.contact_name || o.customer?.name || null,
      identification: o.contact_identification || o.billing_address?.identification || null,
      phone: o.contact_phone || o.customer?.phone || addr.phone || null,
      email: o.contact_email || o.customer?.email || null,
      address: {
        zipcode: addr.zipcode || null,
        address: addr.address || null,
        number: addr.number || null,
        floor: addr.floor || null,
        locality: addr.locality || null,
        city: addr.city || null,
        province: addr.province || null,
      },
      products: (o.products || []).map((p: any) => ({
        name: p.name,
        variant: (p.variant_values || []).join(' / ') || null,
        image: p.image?.src || null,
        quantity: Number(p.quantity || 1),
        price: Number(p.price || 0),
        subtotal: Number(p.price || 0) * Number(p.quantity || 1),
      })),
      subtotal: Number(o.subtotal || 0),
      shipping_cost: Number(o.shipping_cost_customer ?? o.shipping_cost_owner ?? 0),
      shipping_name: shippingName,
      discount: Number(o.discount || 0),
      promotional_discount: Number(o.promotional_discount?.total_discount_amount || o.promotional_discount || 0),
      coupons,
      interest: Number(o.payment_details?.installments_info?.interest || 0),
      total: Number(o.total || 0),
      payment_method: o.payment_details?.method || o.gateway || null,
      gateway_name: gatewayName,
    }

    return new Response(JSON.stringify({ success: true, details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})