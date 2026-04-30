import { useState, useEffect } from "react";
import { MessageSquare, Brain, Loader2, ShoppingBag, Mail, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationSidebar, type IntegrationId } from "@/components/api/IntegrationSidebar";
import { UazapiConfig } from "@/components/api/UazapiConfig";
import { GroqConfig } from "@/components/api/GroqConfig";
import { NuvemshopConfig } from "@/components/api/NuvemshopConfig";
import { BrevoConfig } from "@/components/api/BrevoConfig";
import { MetaConfig } from "@/components/api/MetaConfig";
import { InstagramPersonalConfig } from "@/components/api/InstagramPersonalConfig";

interface InstanceStatus {
  connected: boolean;
  serverUrl?: string;
  phoneNumber?: string;
  name?: string;
  status?: string;
  message?: string;
  error?: string;
}

interface GroqStatus {
  connected: boolean;
  model?: string;
  error?: string;
}

interface NuvemshopStatus {
  connected: boolean;
  orderCount?: number;
  error?: string;
}

interface BrevoStatus {
  connected: boolean;
  senderName?: string;
  senderEmail?: string;
  error?: string;
}

export default function Api() {
  const [activeIntegration, setActiveIntegration] = useState<IntegrationId>("uazapi");
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus | null>(null);
  const [groqStatus, setGroqStatus] = useState<GroqStatus | null>(null);
  const [nuvemshopStatus, setNuvemshopStatus] = useState<NuvemshopStatus | null>(null);
  const [brevoStatus, setBrevoStatus] = useState<BrevoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([checkInstanceStatus(), checkGroqStatus(), checkBrevoStatus()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const checkInstanceStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-uazapi-status");
      if (error) {
        setInstanceStatus({ connected: false, error: error.message });
      } else if (data) {
        setInstanceStatus({
          connected: data.connected,
          serverUrl: data.serverUrl,
          phoneNumber: data.phoneNumber,
          name: data.name,
          status: data.status,
          message: data.message,
          error: data.error,
        });
      }
    } catch (error) {
      setInstanceStatus({ connected: false, error: "Erro de conexão" });
    }
  };

  const checkGroqStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("groq-chat", {
        body: {
          messages: [{ role: "user", content: "ping" }],
          model: "llama-3.3-70b-versatile",
          max_tokens: 5,
        },
      });

      if (error) {
        setGroqStatus({ connected: false, error: error.message });
      } else if (data?.error) {
        setGroqStatus({ connected: false, error: data.error });
      } else if (data?.choices) {
        setGroqStatus({ connected: true, model: data.model });
      } else {
        setGroqStatus({ connected: false, error: "Resposta inesperada" });
      }
    } catch (error) {
      setGroqStatus({ connected: false, error: "Erro de conexão" });
    }
  };

  const checkBrevoStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: { action: "test-connection" },
      });
      if (error) {
        setBrevoStatus({ connected: false, error: error.message });
      } else if (data?.success) {
        setBrevoStatus({
          connected: true,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
        });
      } else {
        setBrevoStatus({ connected: false, error: data?.error || "Falha" });
      }
    } catch {
      setBrevoStatus({ connected: false, error: "Erro de conexão" });
    }
  };

  const integrations = [
    {
      id: "uazapi" as IntegrationId,
      name: "WhatsApp (UAZAPI)",
      description: "Envio e recebimento de mensagens",
      icon: <MessageSquare className="w-5 h-5" />,
      connected: instanceStatus?.connected ?? false,
    },
    {
      id: "groq" as IntegrationId,
      name: "Groq Cloud AI",
      description: "Automação inteligente",
      icon: <Brain className="w-5 h-5" />,
      connected: groqStatus?.connected ?? false,
    },
    {
      id: "nuvemshop" as IntegrationId,
      name: "Nuvemshop",
      description: "Pedidos via webhook",
      icon: <ShoppingBag className="w-5 h-5" />,
      connected: nuvemshopStatus?.connected ?? false,
    },
    {
      id: "brevo" as IntegrationId,
      name: "Brevo",
      description: "E-mails de recuperação",
      icon: <Mail className="w-5 h-5" />,
      connected: brevoStatus?.connected ?? false,
    },
    {
      id: "meta" as IntegrationId,
      name: "Meta",
      description: "Instagram & Messenger DMs",
      icon: <Instagram className="w-5 h-5" />,
      connected: false,
    },
    {
      id: "instagram-personal" as IntegrationId,
      name: "Instagram Pessoal",
      description: "DMs via cookie da sua conta",
      icon: <Instagram className="w-5 h-5" />,
      connected: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      <IntegrationSidebar
        activeIntegration={activeIntegration}
        onSelect={setActiveIntegration}
        integrations={integrations}
      />
      
      {activeIntegration === "uazapi" && (
        <UazapiConfig status={instanceStatus} onStatusChange={setInstanceStatus} />
      )}
      
      {activeIntegration === "groq" && (
        <GroqConfig status={groqStatus} onStatusChange={setGroqStatus} />
      )}
      
      {activeIntegration === "nuvemshop" && (
        <NuvemshopConfig status={nuvemshopStatus} onStatusChange={setNuvemshopStatus} />
      )}
      
      {activeIntegration === "brevo" && (
        <BrevoConfig status={brevoStatus} onStatusChange={setBrevoStatus} />
      )}

      {activeIntegration === "meta" && <MetaConfig />}

      {activeIntegration === "instagram-personal" && <InstagramPersonalConfig />}
    </div>
  );
}
