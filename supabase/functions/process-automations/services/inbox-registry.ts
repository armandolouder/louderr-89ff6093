 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 export async function registerInInbox(supabase: SupabaseClient, params: {
   phone: string;
   customerName: string;
   messageContent: string;
   mediaUrl?: string;
   mediaType?: string;
   uazapiData: any;
  flowId?: string;
  executionId?: string;
  userId?: string | null;
  source?: string;
 }) {
  const { phone, customerName, messageContent, mediaUrl, mediaType, uazapiData, flowId, executionId, source } = params;
  let userId = params.userId ?? null;
   
   try {
    // Resolve owner user_id when not provided (service role bypasses set_user_id trigger)
    if (!userId) {
      const { data: ownerData } = await supabase.rpc("get_webhook_owner_user_id");
      userId = (ownerData as string | null) ?? null;
    }

     // 1. Find or create contact
     const phoneVariants = [phone, `+${phone}`, `+55${phone}`];
    let contactQuery = supabase.from("contacts").select("id")
      .or(phoneVariants.map(p => `phone.eq.${p}`).join(",")).limit(1);
    if (userId) contactQuery = contactQuery.eq("user_id", userId);
    const { data: contacts } = await contactQuery;
 
     let contactId = contacts?.[0]?.id;
     if (!contactId) {
      const { data: newContact } = await supabase.from("contacts").insert({ name: customerName, phone, user_id: userId }).select("id").single();
       contactId = newContact?.id;
     }
     if (!contactId) return;
 
     // 2. Find or create conversation
    let convQuery = supabase.from("conversations").select("id")
      .eq("contact_id", contactId).eq("channel", "whatsapp").limit(1);
    if (userId) convQuery = convQuery.eq("user_id", userId);
    const { data: convs } = await convQuery;
 
     let conversationId = convs?.[0]?.id;
     if (!conversationId) {
       const { data: newConv } = await supabase.from("conversations").insert({
         contact_id: contactId, channel: "whatsapp", status: "novo",
         last_message: messageContent, last_message_at: new Date().toISOString(),
        user_id: userId,
       }).select("id").single();
       conversationId = newConv?.id;
     }
     if (!conversationId) return;
 
     // 3. Insert message
     await supabase.from("messages").insert({
       conversation_id: conversationId,
       content: messageContent,
       sender_type: "agent",
       message_type: mediaUrl ? mediaType : "text",
       media_url: mediaUrl || null,
       status: "sent",
      user_id: userId,
      metadata: { uazapi_response: uazapiData, automation_flow_id: flowId, automation_execution_id: executionId, source: source || "automation" },
     });
 
     // 4. Update conversation
     await supabase.from("conversations").update({
       last_message: messageContent,
       last_message_at: new Date().toISOString(),
     }).eq("id", conversationId);
     
   } catch (err) {
     console.error("[INBOX] Error registering in inbox:", err);
   }
 }