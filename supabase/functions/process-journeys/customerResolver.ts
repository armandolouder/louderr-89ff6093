// Try to resolve email from page_views, imported_customers, or contacts
export async function resolveCustomerEmail(
  supabase: any,
  exec: any
): Promise<{ email: string | null; name: string | null }> {
  if (exec.customer_email) return { email: exec.customer_email, name: exec.customer_name };

  const visitorOrPhone = exec.customer_phone;
  if (!visitorOrPhone) return { email: null, name: null };

  // 1. visitor_id → page_views
  const { data: pageView } = await supabase
    .from("page_views")
    .select("customer_email, customer_name")
    .eq("visitor_id", visitorOrPhone)
    .not("customer_email", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pageView?.customer_email) {
    return { email: pageView.customer_email, name: pageView.customer_name || exec.customer_name };
  }

  // 2. phone → imported_customers
  const { data: customer } = await supabase
    .from("imported_customers")
    .select("email, name, phone")
    .or(`phone.eq.${visitorOrPhone},phone.ilike.%${visitorOrPhone.slice(-8)}`)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();

  if (customer?.email) {
    return { email: customer.email, name: customer.name || exec.customer_name };
  }

  // 3. phone → contacts
  const { data: contact } = await supabase
    .from("contacts")
    .select("email, name, phone")
    .or(`phone.eq.${visitorOrPhone},phone.ilike.%${visitorOrPhone.slice(-8)}`)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();

  if (contact?.email) {
    return { email: contact.email, name: contact.name || exec.customer_name };
  }

  return { email: null, name: exec.customer_name };
}