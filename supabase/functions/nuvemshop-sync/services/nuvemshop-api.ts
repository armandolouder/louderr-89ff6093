 import { SyncOrdersParams } from "../utils/params.ts";
 
 export async function fetchOrdersFromNuvemshop(params: SyncOrdersParams) {
   const accessToken = Deno.env.get("NUVEMSHOP_ACCESS_TOKEN")?.trim();
   const storeId = Deno.env.get("NUVEMSHOP_STORE_ID");
 
   if (!accessToken || !storeId) {
     throw new Error("NUVEMSHOP_ACCESS_TOKEN ou NUVEMSHOP_STORE_ID não configurados");
   }
 
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