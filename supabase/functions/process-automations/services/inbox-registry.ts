 import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 export async function registerInInbox(supabase: SupabaseClient, params: {
   phone: string;
   customerName: string;
   messageContent: string;
   mediaUrl?: string;
   mediaType?: string;
   uazapiData: any;
   flowId: string;
   executionId: string;
 }) {
   const { phone, customerName, messageContent, mediaUrl, mediaType, uazapiData, flowId, executionId } = params;
   
   try {
     // 1. Find or create contact
     const phoneVariants = [phone, `+${phone}`, `+55${phone}`];
     const { data: contacts } = await supabase.from("contacts").select("id")
       .or(phoneVariants.map(p => `phone.eq.${p}`).join(",")).limit(1);
 
     let contactId = contacts?.[0]?.id;
     if (!contactId) {
       const { data: newContact } = await supabase.from("contacts").insert({ name: customerName, phone }).select("id").single();
       contactId = newContact?.id;
     }
     if (!contactId) return;
 
     // 2. Find or create conversation
     const { data: convs } = await supabase.from("conversations").select("id")
       .eq("contact_id", contactId).eq("channel", "whatsapp").limit(1);
 
     let conversationId = convs?.[0]?.id;
     if (!conversationId) {
       const { data: newConv } = await supabase.from("conversations").insert({
         contact_id: contactId, channel: "whatsapp", status: "novo",
         last_message: messageContent, last_message_at: new Date().toISOString(),
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
       metadata: { uazapi_response: uazapiData, automation_flow_id: flowId, automation_execution_id: executionId },
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