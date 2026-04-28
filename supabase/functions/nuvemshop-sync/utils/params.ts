 export interface SyncOrdersParams {
   page: number;
   perPage: number;
   sinceId: string | null;
   createdAtMin: string | null;
   createdAtMax: string | null;
   customerIds: number[];
   q: string | null;
 }
 
 function parsePositiveInt(value: unknown, fallback: number) {
   const parsed = typeof value === "number"
     ? value
     : typeof value === "string"
     ? parseInt(value, 10)
     : NaN;
   return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
 }
 
 function parseOptionalString(value: unknown) {
   if (typeof value !== "string") return null;
   const trimmed = value.trim();
   return trimmed.length > 0 ? trimmed : null;
 }
 
 function parseCustomerIds(value: unknown) {
   if (Array.isArray(value)) {
     return value.map((item) => parsePositiveInt(item, 0)).filter((item) => item > 0);
   }
   if (typeof value === "string") {
     return value.split(",").map((item) => parsePositiveInt(item.trim(), 0)).filter((item) => item > 0);
   }
   return [] as number[];
 }
 
 export async function getSyncParams(req: Request): Promise<SyncOrdersParams> {
   const url = new URL(req.url);
   let body: Record<string, unknown> = {};
 
   if (req.method !== "GET") {
     try {
       const rawBody = await req.text();
       if (rawBody) {
         const parsed = JSON.parse(rawBody);
         if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
           body = parsed as Record<string, unknown>;
         }
       }
     } catch {
       // Ignora erro de body vazio ou inválido
     }
   }
 
   return {
     page: parsePositiveInt(body.page ?? url.searchParams.get("page"), 1),
     perPage: Math.min(
       parsePositiveInt(body.perPage ?? body.per_page ?? url.searchParams.get("per_page"), 50),
       200,
     ),
     sinceId: parseOptionalString(body.sinceId ?? body.since_id ?? url.searchParams.get("since_id")),
     createdAtMin: parseOptionalString(body.createdAtMin ?? body.created_at_min ?? url.searchParams.get("created_at_min")),
     createdAtMax: parseOptionalString(body.createdAtMax ?? body.created_at_max ?? url.searchParams.get("created_at_max")),
     customerIds: parseCustomerIds(body.customerIds ?? body.customer_ids ?? url.searchParams.get("customer_ids")),
     q: parseOptionalString(body.q ?? url.searchParams.get("q")),
   };
 }