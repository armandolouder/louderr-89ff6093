 import { useState } from "react";
 import { Server, Key, RefreshCw, ExternalLink, CheckCircle, Wifi, WifiOff, Settings2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface InstanceStatus {
   connected: boolean;
   serverUrl?: string;
   phoneNumber?: string;
   name?: string;
   status?: string;
   message?: string;
   error?: string;
   provider?: string;
 }
 
 interface EvolutionConfigProps {
   status: InstanceStatus | null;
   onStatusChange: (status: InstanceStatus) => void;
 }
 
 export function EvolutionConfig({ status, onStatusChange }: EvolutionConfigProps) {
   const [isChecking, setIsChecking] = useState(false);
   const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("evo_url_cache") || "");
   const [apiKey, setApiKey] = useState(() => localStorage.getItem("evo_key_cache") || "");
   const [instanceName, setInstanceName] = useState(() => localStorage.getItem("evo_instance_cache") || "");
 
   const handleUrlChange = (val: string) => {
     setApiUrl(val);
     localStorage.setItem("evo_url_cache", val);
   };
 
   const handleKeyChange = (val: string) => {
     setApiKey(val);
     localStorage.setItem("evo_key_cache", val);
   };
 
   const handleInstanceChange = (val: string) => {
     setInstanceName(val);
     localStorage.setItem("evo_instance_cache", val);
   };
 
   const saveConfig = async () => {
     if (!apiUrl || !apiKey || !instanceName) {
       toast.error("Preencha todos os campos");
       return;
     }
     
     // This is a UI-only representation since actual secrets are managed via Lovable Cloud.
     // In a real scenario, we'd need a way to store these. 
     // For now, let's at least make the inputs editable so the user can see what they're doing
     // and I will explain that they need to be set in the Cloud dashboard or I can trigger the secret tool again.
     toast.info("As credenciais foram inseridas. Agora clique em 'Verificar Conexão' para testar.");
   };
 
  const checkStatus = async () => {
    if (!apiUrl || !apiKey || !instanceName) {
      toast.error("Preencha todos os campos do formulário antes de verificar");
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-uazapi-status", {
        body: {
          evolution_url: apiUrl,
          evolution_key: apiKey,
          evolution_instance: instanceName
        }
      });

      if (error) {
        console.error("Error checking status:", error);
        onStatusChange({ connected: false, error: error.message });
        toast.error("Erro ao verificar status");
      } else if (data) {
        onStatusChange({
          connected: data.connected,
          serverUrl: data.serverUrl,
          phoneNumber: data.phoneNumber,
          name: data.name,
          status: data.status,
          message: data.message,
          error: data.error,
          provider: data.provider
        });
        
        if (data.connected) {
          toast.success("Evolution API conectada!");
        } else if (data.error) {
          toast.error(data.error);
        }
      }
    } catch (error) {
      console.error("Error checking instance status:", error);
      onStatusChange({ connected: false, error: "Erro de conexão" });
      toast.error("Erro ao verificar status da instância");
    } finally {
      setIsChecking(false);
    }
  };
 
   return (
     <div className="flex-1 p-6 overflow-y-auto">
       <div className="max-w-2xl space-y-6">
         {/* Header */}
         <div>
           <h1 className="text-xl font-semibold text-foreground">WhatsApp (Evolution API)</h1>
           <p className="text-sm text-muted-foreground mt-1">
             Configure sua instância Evolution API v2 para automações avançadas do WhatsApp
           </p>
         </div>
 
         {/* Status Card */}
         <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
           {status?.connected && status?.provider === "evolution" ? (
             <>
               <Wifi className="w-5 h-5 text-primary" />
               <div className="flex-1">
                 <p className="font-medium text-foreground">Instância Conectada</p>
                 <p className="text-sm text-muted-foreground">
                   {status.name && `Instância: ${status.name}`}
                 </p>
               </div>
               <Badge variant="default">
                 <CheckCircle className="w-3 h-3 mr-1" />
                 Online
               </Badge>
             </>
           ) : (
             <>
               <WifiOff className="w-5 h-5 text-muted-foreground" />
               <div className="flex-1">
                 <p className="font-medium text-foreground">Instância Desconectada ou em Espera</p>
                 <p className="text-sm text-muted-foreground">
                   {status?.error || "Verifique se WHATSAPP_PROVIDER está como 'evolution' nos secrets"}
                 </p>
               </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary">Offline</Badge>
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Secret: WHATSAPP_PROVIDER = evolution
                  </p>
                </div>
             </>
           )}
         </div>
 
         <Separator />
 
         {/* Configuration Info */}
         <div className="space-y-4">
           <h3 className="text-sm font-medium text-foreground">Configuração Necessária (Secrets)</h3>
           <p className="text-xs text-muted-foreground">
             Para ativar a Evolution API, configure os seguintes secrets no backend:
           </p>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="provider">Provedor Ativo</Label>
               <Input 
                 id="provider" 
                 value="evolution" 
                 readOnly 
                 className="bg-muted font-mono text-sm"
               />
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="evo-url">Evolution API URL</Label>
               <Input 
                 id="evo-url" 
                 placeholder="https://seu-servidor.com" 
                 value={apiUrl}
                 onChange={(e) => handleUrlChange(e.target.value)}
                 className="font-mono text-sm"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="evo-key">Global API Key</Label>
               <Input 
                 id="evo-key" 
                 type="password"
                 placeholder="Sua apikey global" 
                 value={apiKey}
                 onChange={(e) => handleKeyChange(e.target.value)}
                 className="font-mono text-sm"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="evo-instance">Nome da Instância</Label>
               <Input 
                 id="evo-instance" 
                 placeholder="Ex: MinhaInstancia" 
                 value={instanceName}
                 onChange={(e) => handleInstanceChange(e.target.value)}
                 className="font-mono text-sm"
               />
             </div>
             
             <p className="text-[10px] text-muted-foreground italic">
               Nota: As alterações aqui são para visualização. Certifique-se de que os valores coincidem com os configurados nos Secrets do Lovable Cloud.
             </p>
           </div>
         </div>
 
         <Separator />
 
         {/* Webhook Info */}
         <div className="space-y-3">
           <h3 className="text-sm font-medium text-foreground">Configuração do Webhook</h3>
           <div className="p-3 rounded-lg bg-secondary/50 border border-border">
             <p className="text-xs text-muted-foreground mb-2">Configure este Webhook na sua instância Evolution:</p>
             <code className="text-xs bg-background px-2 py-1 rounded border border-border block overflow-x-auto">
               {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
             </code>
             <p className="text-[10px] text-muted-foreground mt-2">
               Ative os eventos: <code className="bg-muted">MESSAGES_UPSERT</code> e <code className="bg-muted">MESSAGES_UPDATE</code>
             </p>
           </div>
         </div>
 
         <Separator />
 
         {/* Actions */}
         <div className="flex flex-wrap gap-3">
           <Button
             onClick={checkStatus}
             disabled={isChecking}
           >
             <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
             Verificar Conexão
           </Button>
           <Button
             variant="outline"
             asChild
           >
             <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer">
               <ExternalLink className="w-4 h-4 mr-2" />
               Documentação Evolution
             </a>
           </Button>
         </div>
       </div>
     </div>
   );
 }