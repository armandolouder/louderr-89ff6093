import { handleCorsPreflightRequest, jsonResponse } from "../_shared/cors.ts";
import { verifyUserJwt, createServiceClient } from "../_shared/auth.ts";
import { getEvolutionProfilePicture, hasEvolutionCredentials } from "../_shared/evolution-api.ts";
import { phoneCandidates } from "../_shared/phone.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  try {
    const authResult = await verifyUserJwt(req);
    if (!authResult.ok) return authResult.response;
    const { userId } = authResult.auth;

    if (!hasEvolutionCredentials()) {
      return jsonResponse({ success: false, error: "WhatsApp (Evolution API) não configurado" }, { status: 400 });
    }

    let body: { contactId?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const contactId = body.contactId;
    if (!contactId) {
      return jsonResponse({ success: false, error: "contactId é obrigatório" }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: contact, error: contactError } = await service
      .from("contacts")
      .select("id, phone, user_id")
      .eq("id", contactId)
      .eq("user_id", userId)
      .maybeSingle();

    if (contactError) throw contactError;
    if (!contact) {
      return jsonResponse({ success: false, error: "Contato não encontrado" }, { status: 404 });
    }
    if (!contact.phone) {
      return jsonResponse({ success: false, error: "Contato sem telefone" }, { status: 400 });
    }

    // Tenta variações do número (com/sem 9º dígito)
    let imageUrl: string | null = null;
    for (const candidate of phoneCandidates(contact.phone)) {
      const result = await getEvolutionProfilePicture(candidate);
      const data = result.data as Record<string, unknown> | null;
      const url = (data?.profilePictureUrl || data?.imgUrl || data?.imageUrl || data?.image || data?.url) as string | undefined;
      if (result.ok && url && typeof url === "string" && url.startsWith("http")) {
        imageUrl = url;
        break;
      }
    }

    if (!imageUrl) {
      return jsonResponse({ success: false, error: "Foto de perfil não disponível no WhatsApp" }, { status: 404 });
    }

    // Baixa a imagem e armazena no bucket para persistir (URLs do WhatsApp expiram)
    let storedUrl = imageUrl;
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const bytes = new Uint8Array(await imgRes.arrayBuffer());
        const path = `${userId}/avatars/${contactId}-${Date.now()}.${ext}`;
        const { error: uploadError } = await service.storage
          .from("whatsapp-media")
          .upload(path, bytes, { contentType, upsert: true });
        if (!uploadError) {
          const { data: pub } = service.storage.from("whatsapp-media").getPublicUrl(path);
          if (pub?.publicUrl) storedUrl = pub.publicUrl;
        }
      }
    } catch (_e) {
      // fallback para URL direta do WhatsApp
    }

    const { error: updateError } = await service
      .from("contacts")
      .update({ avatar_url: storedUrl })
      .eq("id", contactId)
      .eq("user_id", userId);

    if (updateError) throw updateError;

    return jsonResponse({ success: true, avatar_url: storedUrl });
  } catch (e) {
    console.error("fetch-whatsapp-photo error:", e);
    return jsonResponse({ success: false, error: (e as Error).message || "Erro interno" }, { status: 500 });
  }
});