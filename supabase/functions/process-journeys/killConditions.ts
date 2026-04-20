// Evaluate journey kill conditions (e.g., purchase made after start)
export async function checkKillConditions(
  supabase: any,
  exec: any,
  killConditions: string[] | null | undefined
): Promise<{ kill: boolean; reason?: string }> {
  if (!killConditions || killConditions.length === 0) return { kill: false };

  const customerPhone = exec.customer_phone;
  const customerEmail = exec.customer_email;

  if (killConditions.includes("purchase") && customerPhone) {
    const { data: orders } = await supabase
      .from("nuvemshop_orders")
      .select("id")
      .or(`customer_phone.eq.${customerPhone},customer_email.eq.${customerEmail || ""}`)
      .gte("created_at", exec.started_at)
      .limit(1);

    if (orders && orders.length > 0) {
      return { kill: true, reason: "Kill condition: purchase detected" };
    }
  }

  return { kill: false };
}