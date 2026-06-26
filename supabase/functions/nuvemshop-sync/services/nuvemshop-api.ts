 import { SyncOrdersParams } from "../utils/params.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { getNuvemshopCredentials } from "../../_shared/nuvemshop.ts";
 
 export async function fetchOrdersFromNuvemshop(params: SyncOrdersParams) {
   const supabase = createClient(
     Deno.env.get("SUPABASE_URL")!,
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
   );
   const { accessToken, storeId } = await getNuvemshopCredentials(supabase);
 
   const { page, perPage, sinceId, createdAtMin, createdAtMax, customerIds, q } = params;
   const apiBaseUrl = "https://api.tiendanube.com/v1";
   let apiUrl = `${apiBaseUrl}/${storeId}/orders?page=${page}&per_page=${perPage}`;
   
   if (sinceId) apiUrl += `&since_id=${sinceId}`;
   if (createdAtMin) apiUrl += `&created_at_min=${encodeURIComponent(createdAtMin)}`;
   if (createdAtMax) apiUrl += `&created_at_max=${encodeURIComponent(createdAtMax)}`;
   if (customerIds.length > 0) apiUrl += `&customer_ids=${encodeURIComponent(customerIds.join(","))}`;
   if (q) apiUrl += `&q=${encodeURIComponent(q)}`;
 
   const response = await fetch(apiUrl, {
     headers: {
       "Authentication": `bearer ${accessToken}`,
       "User-Agent": "LOUDER.ink (allvisualweb@gmail.com)",
       "Content-Type": "application/json",
     },
   });
 
   if (!response.ok) {
     const errorText = await response.text();
     throw new Error(`Nuvemshop API error: ${response.status} - ${errorText}`);
   }
 
   return await response.json();
 }