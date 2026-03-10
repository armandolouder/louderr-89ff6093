import { useState, useEffect } from "react";
import { Download, Smartphone, Check, Share, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Instalado!</CardTitle>
            <CardDescription>
              O OmniDesk já está instalado no seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/inbox">Abrir App</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4 shadow-glow">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Instale o OmniDesk</CardTitle>
          <CardDescription>
            Tenha acesso rápido ao app direto da tela inicial do seu celular
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">Acesso rápido sem abrir navegador</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">Funciona mesmo offline</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">Notificações em tempo real</span>
            </div>
          </div>

          {/* Install Instructions */}
          {isIOS ? (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm font-medium text-foreground">Para instalar no iPhone:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Toque em <Share className="w-4 h-4" /> <span className="font-medium">Compartilhar</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Role e toque em <Plus className="w-4 h-4" /> <span className="font-medium">Adicionar à Tela de Início</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Toque em <span className="font-medium">Adicionar</span>
                  </span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="w-full shadow-glow" size="lg">
              <Download className="w-5 h-5 mr-2" />
              Instalar Agora
            </Button>
          ) : (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm font-medium text-foreground">Para instalar no Android:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Toque em <MoreVertical className="w-4 h-4" /> <span className="font-medium">Menu do navegador</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Toque em <span className="font-medium">"Instalar aplicativo"</span> ou <span className="font-medium">"Adicionar à tela inicial"</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button variant="outline" asChild className="w-full">
            <a href="/inbox">Continuar no navegador</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
