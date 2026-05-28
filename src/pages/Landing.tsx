import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Instagram, 
  Bot, 
  Users, 
  Zap, 
  Shield,
  ArrowRight,
  Check,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "WhatsApp Integrado",
    description: "Conecte múltiplas contas e gerencie todas as conversas em um único lugar.",
  },
  {
    icon: Instagram,
    title: "Instagram Direct",
    description: "Responda mensagens do Instagram sem sair da plataforma.",
  },
  {
    icon: Bot,
    title: "Bot Inteligente",
    description: "Automatize respostas com IA e fluxos personalizáveis.",
  },
  {
    icon: Users,
    title: "CRM Completo",
    description: "Histórico de clientes, tags e segmentação avançada.",
  },
  {
    icon: Zap,
    title: "Tempo Real",
    description: "Atualizações instantâneas via WebSocket.",
  },
  {
    icon: Shield,
    title: "Seguro e Confiável",
    description: "Dados criptografados e conformidade com LGPD.",
  },
];

export default function Landing() {
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Usuários logados vão direto para o Resumo Geral
  if (session) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">OmniDesk</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button className="shadow-glow">
                Começar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Plataforma #1 em Atendimento</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground max-w-4xl mx-auto leading-tight mb-6">
            Atendimento
            <span className="text-gradient"> Omnichannel </span>
            Inteligente
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Centralize WhatsApp e Instagram em uma única plataforma. 
            Automatize com IA e aumente a produtividade da sua equipe.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-8 shadow-glow">
                Testar Grátis por 14 Dias
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 border-border text-foreground">
              Ver Demonstração
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20">
            {[
              { value: "10k+", label: "Empresas" },
              { value: "2M+", label: "Mensagens/mês" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl lg:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Uma plataforma completa para gerenciar o atendimento da sua empresa
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-card border border-border rounded-xl hover:border-primary/30 transition-all duration-300 hover:shadow-glow group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Preço Simples e Transparente
            </h2>
            <p className="text-lg text-muted-foreground">
              Um único plano com tudo incluso
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="p-8 bg-card border-2 border-primary rounded-2xl shadow-glow">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
                  Plano Anual
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-foreground">R$ 99</span>
                  <span className="text-muted-foreground">/ano</span>
                </div>
                <p className="text-muted-foreground mt-2">Menos de R$ 9/mês</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  "WhatsApp e Instagram ilimitados",
                  "Até 5 atendentes",
                  "Bot com IA (Gemini)",
                  "CRM completo",
                  "Relatórios avançados",
                  "Suporte prioritário",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-accent/20 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Link to="/dashboard">
                <Button size="lg" className="w-full text-lg shadow-glow">
                  Assinar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">OmniDesk</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 OmniDesk. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
