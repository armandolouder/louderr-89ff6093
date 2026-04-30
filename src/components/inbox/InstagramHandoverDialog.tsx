import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage?: string;
}

export function InstagramHandoverDialog({ open, onOpenChange, errorMessage }: Props) {
  // Open at top-level to escape the preview iframe (Facebook blocks framing via X-Frame-Options)
  const openExternal = (url: string) => {
    try {
      const win = (window.top ?? window).open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — copy URL as fallback
        navigator.clipboard?.writeText(url);
        toast.error("Popup bloqueado. Link copiado — cole no navegador.");
      }
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard?.writeText(url);
    toast.success("Link copiado!");
  };

  const steps = [
    {
      title: "Abrir Meta Business Suite",
      desc: "Acesse o Business Suite com a conta dona da Página/Instagram conectado.",
      link: "https://business.facebook.com/latest/home",
      cta: "Abrir Business Suite",
    },
    {
      title: "Abrir Configurações do Negócio",
      desc: "No Business Suite, clique no ícone de engrenagem (Configurações) na barra lateral esquerda → 'Configurações do Negócio'. Em Contas → Páginas, selecione a Página vinculada ao Instagram (LOUDER.ink).",
      link: "https://business.facebook.com/settings/pages",
      cta: "Abrir Páginas do Negócio",
    },
    {
      title: "Abrir 'Mensagens avançadas' da Página",
      desc: "No Facebook clássico da Página: Configurações da Página → 'Mensagens avançadas' (Advanced Messaging). Lá ficam os apps conectados via Handover Protocol.",
      link: "https://www.facebook.com/settings?tab=advanced_messaging",
      cta: "Abrir Mensagens avançadas",
    },
    {
      title: "Habilitar este app como 'Receptor Secundário'",
      desc: "Em 'Aplicativos conectados', localize este app e ative a permissão 'Controle de conversa' (messaging_handover). Isso permite que tomemos o controle do thread vindo da Meta Inbox.",
    },
    {
      title: "Renovar a janela de 24h",
      desc: "Peça ao cliente para enviar uma nova mensagem no @louder.ink (ou envie você mesmo de outra conta de teste). Depois volte aqui e tente enviar novamente.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle>Configuração necessária na Meta</DialogTitle>
              <DialogDescription className="mt-1">
                A Meta Inbox está com controle do thread. Para enviar pelo nosso inbox, você precisa autorizar este app no Handover Protocol.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-muted border border-border p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Erro retornado pela Meta:</strong>
            <div className="mt-1 font-mono text-xs">{errorMessage}</div>
          </div>
        )}

        <div className="bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-foreground">
          <strong>Atenção:</strong> os links da Meta não abrem dentro do preview do Lovable (o Facebook bloqueia iframes). Os botões abaixo abrem em uma nova janela do navegador. Se o popup for bloqueado, use o botão <Copy className="inline w-3 h-3" /> para copiar o link.
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-7 h-7 bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                {step.link && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openExternal(step.link!)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      {step.cta} <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyUrl(step.link!)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      title="Copiar link"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 p-3 flex gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-foreground">
            Após completar os passos, feche este aviso e clique em <strong>Enviar</strong> novamente. Vamos tentar tomar o controle do thread automaticamente.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => openExternal("https://business.facebook.com/latest/home")}>
            Abrir Meta Business <ExternalLink className="w-4 h-4 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}