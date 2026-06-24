import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Eye, MapPin, ShoppingBag, Monitor, Smartphone, Tablet, 
  RefreshCw, Copy, CheckCircle, Search, Clock, Globe, Users, Link2, Mail
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface PageView {
  id: string;
  visitor_id: string;
  session_id: string | null;
  page_url: string;
  page_title: string | null;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  product_category: string | null;
  product_image_url: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  state: string | null;
  city: string | null;
  device_type: string | null;
  referrer: string | null;
  utm_source: string | null;
  created_at: string;
  duration_seconds: number | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getDeviceIcon(device: string | null) {
  switch (device?.toLowerCase()) {
    case "mobile": return <Smartphone className="w-4 h-4" />;
    case "tablet": return <Tablet className="w-4 h-4" />;
    default: return <Monitor className="w-4 h-4" />;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export default function Tracking() {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [bindVisitorId, setBindVisitorId] = useState("");
  const [bindEmail, setBindEmail] = useState("");
  const [bindName, setBindName] = useState("");
  const [isBinding, setIsBinding] = useState(false);

  const { data: pageViews = [], isLoading, refetch } = useQuery({
    queryKey: ["page-views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as PageView[];
    },
    refetchInterval: 15000,
  });

  // Stats
  const uniqueVisitors = new Set(pageViews.map(p => p.visitor_id)).size;
  const productViews = pageViews.filter(p => p.product_id);
  const uniqueProducts = new Set(productViews.map(p => p.product_id)).size;
  const states = pageViews.reduce((acc, p) => {
    if (p.state) acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topStates = Object.entries(states).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top products
  const productCounts = productViews.reduce((acc, p) => {
    const key = p.product_id!;
    if (!acc[key]) acc[key] = { name: p.product_name || key, count: 0, price: p.product_price, image: p.product_image_url, category: p.product_category };
    acc[key].count++;
    return acc;
  }, {} as Record<string, { name: string; count: number; price: number | null; image: string | null; category: string | null }>);
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  // Filter
  const filtered = pageViews.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.product_name?.toLowerCase().includes(s) ||
      p.customer_name?.toLowerCase().includes(s) ||
      p.customer_email?.toLowerCase().includes(s) ||
      p.visitor_id?.toLowerCase().includes(s) ||
      p.state?.toLowerCase().includes(s) ||
      p.city?.toLowerCase().includes(s) ||
      p.page_url?.toLowerCase().includes(s)
    );
  });

  // Unique visitors for binding dropdown
  const uniqueVisitorIds = [...new Set(pageViews.map(p => p.visitor_id))];

  const handleBindEmail = async () => {
    if (!bindVisitorId || !bindEmail) {
      toast.error("Informe o Visitor ID e o Email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bindEmail)) {
      toast.error("Email inválido");
      return;
    }

    setIsBinding(true);
    try {
      const { error } = await supabase.functions.invoke("track-pageview", {
        body: {
          shop_id: "manual_bind",
          visitor_id: bindVisitorId.trim(),
          page_url: "manual://email-bind",
          page_title: "Vinculação manual de email",
          customer_email: bindEmail.trim(),
          customer_name: bindName.trim() || null,
          device_type: "desktop",
        },
      });

      if (error) throw error;

      // Also update existing pageviews for this visitor
      const { error: updateError } = await supabase
        .from("page_views")
        .update({ 
          customer_email: bindEmail.trim(), 
          customer_name: bindName.trim() || null 
        })
        .eq("visitor_id", bindVisitorId.trim())
        .is("customer_email", null);

      if (updateError) {
        console.warn("Could not update existing pageviews:", updateError);
      }

      // Update existing journey executions for this visitor that lack email
      const { error: journeyError } = await supabase
        .from("journey_executions")
        .update({ 
          customer_email: bindEmail.trim(), 
          customer_name: bindName.trim() || null 
        })
        .eq("customer_phone", bindVisitorId.trim())
        .is("customer_email", null);

      if (journeyError) {
        console.warn("Could not update journey executions:", journeyError);
      }

      toast.success(`Email ${bindEmail} vinculado ao visitante ${bindVisitorId.substring(0, 8)}!`);
      setBindVisitorId("");
      setBindEmail("");
      setBindName("");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao vincular: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsBinding(false);
    }
  };

  const pixelScript = `<!-- LOUDER.ink Tracking Pixel -->
<script>
(function(){
  var ENDPOINT="${SUPABASE_URL}/functions/v1/track-pageview";
  var SHOP_ID="SEU_SHOP_ID";
  var vid=localStorage.getItem("_od_vid");
  if(!vid){vid=Math.random().toString(36).substr(2,12)+Date.now().toString(36);localStorage.setItem("_od_vid",vid)}
  var sid=sessionStorage.getItem("_od_sid");
  if(!sid){sid=Math.random().toString(36).substr(2,8);sessionStorage.setItem("_od_sid",sid)}
  var u=new URLSearchParams(location.search);
  var ua=navigator.userAgent;
  if(/bot|crawl|spider|slurp|Googlebot|Bingbot|Applebot|Yandex|Baidu|facebot|ia_archiver|GPTBot/i.test(ua))return;
  var savedEmail=localStorage.getItem("_od_email");
  var data={
    shop_id:SHOP_ID,visitor_id:vid,session_id:sid,
    page_url:location.href,page_title:document.title,
    referrer:document.referrer||null,user_agent:ua,
    utm_source:u.get("utm_source"),utm_medium:u.get("utm_medium"),utm_campaign:u.get("utm_campaign"),
    device_type:/Mobi/i.test(ua)?"mobile":/Tablet/i.test(ua)?"tablet":"desktop"
  };
  // Detect product page (Nuvemshop pattern)
  var pe=document.querySelector("[data-product-id]");
  if(pe){
    data.product_id=pe.getAttribute("data-product-id");
    data.product_name=pe.getAttribute("data-product-name")||document.querySelector("h1")?.innerText;
    data.product_price=pe.getAttribute("data-product-price");
    data.product_category=pe.getAttribute("data-product-category");
    var img=document.querySelector(".product-image img, .js-product-image");
    if(img)data.product_image_url=img.src;
  }
  // Try to get customer info from multiple Nuvemshop sources
  function getCustomer(){
    // 0. Previously identified email (from manual binding or prior detection)
    if(savedEmail&&!data.customer_email){data.customer_email=savedEmail;}
    if(data.customer_email)return;
    // 1. LS.customer (logged-in customer object)
    if(window.LS&&LS.customer&&LS.customer.email){
      data.customer_email=LS.customer.email;data.customer_name=LS.customer.name;data.customer_phone=LS.customer.phone;
      return;
    }
    // 2. LS.store.customer (alternative location)
    if(window.LS&&LS.store&&LS.store.customer&&LS.store.customer.email){
      data.customer_email=LS.store.customer.email;data.customer_name=LS.store.customer.name;data.customer_phone=LS.store.customer.phone;
      return;
    }
    // 3. Check meta tags (some themes expose customer data)
    var metaEmail=document.querySelector('meta[name="customer-email"],meta[property="customer:email"]');
    if(metaEmail&&metaEmail.content){data.customer_email=metaEmail.content;return;}
    // 4. Check for Nuvemshop customer cookie
    try{
      var cookies=document.cookie.split(";");
      for(var i=0;i<cookies.length;i++){
        var c=cookies[i].trim();
        if(c.indexOf("customer_email=")===0){data.customer_email=decodeURIComponent(c.substring(15));return;}
        if(c.indexOf("_ns_customer=")===0){
          try{var cj=JSON.parse(decodeURIComponent(c.substring(13)));if(cj.email){data.customer_email=cj.email;data.customer_name=cj.name;return;}}catch(e){}
        }
      }
    }catch(e){}
    // 5. Check checkout/order confirmation pages for email in DOM
    var emailInputs=document.querySelectorAll('input[type="email"][value],input[name*="email"][value]');
    for(var j=0;j<emailInputs.length;j++){
      if(emailInputs[j].value&&emailInputs[j].value.indexOf("@")>0){data.customer_email=emailInputs[j].value;return;}
    }
  }
  getCustomer();
  // Retry after 2s for async LS.customer load
  if(!data.customer_email){setTimeout(function(){getCustomer();if(data.customer_email){fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(function(){});}},2000);}
  // Also retry after 5s (some themes load customer data very late)
  if(!data.customer_email){setTimeout(function(){getCustomer();if(data.customer_email){fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(function(){});}},5000);}
  // 6. Live capture: detect email as soon as the customer types or submits the form
  function syncEmail(value){
    var v=(value||"").trim();
    if(!v||v===data.customer_email||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v))return;
    data.customer_email=v;
    localStorage.setItem("_od_email",v);
    fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(function(){});
  }
  function watchEmailInputs(){
    var inputs=document.querySelectorAll('input[type="email"],input[autocomplete="email"],input[inputmode="email"],input[name*="email" i],input[placeholder*="mail" i],input[id*="email" i]');
    for(var k=0;k<inputs.length;k++){
      if(inputs[k]._od_watched)continue;
      inputs[k]._od_watched=true;
      var debounceTimer=null;
      var onSync=function(){syncEmail(this.value)};
      inputs[k].addEventListener("blur",onSync);
      inputs[k].addEventListener("change",onSync);
      inputs[k].addEventListener("input",function(){
        var input=this;
        if(debounceTimer)clearTimeout(debounceTimer);
        debounceTimer=setTimeout(function(){syncEmail(input.value)},400);
      });
    }
    var forms=document.querySelectorAll("form");
    for(var f=0;f<forms.length;f++){
      if(forms[f]._od_email_submit_watched)continue;
      forms[f]._od_email_submit_watched=true;
      forms[f].addEventListener("submit",function(){
        var field=this.querySelector('input[type="email"],input[autocomplete="email"],input[inputmode="email"],input[name*="email" i],input[placeholder*="mail" i],input[id*="email" i]');
        if(field)syncEmail(field.value);
      });
    }
  }
  watchEmailInputs();
  // Re-scan for dynamically added email inputs (SPA checkout)
  setTimeout(watchEmailInputs,3000);
  setTimeout(watchEmailInputs,8000);
  var t0=Date.now();
  window.addEventListener("beforeunload",function(){
    getCustomer();
    data.duration_seconds=Math.round((Date.now()-t0)/1000);
    navigator.sendBeacon(ENDPOINT,JSON.stringify(data));
  });
  fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(function(){});
})();
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pixelScript);
    setCopied(true);
    toast.success("Script copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            Rastreamento de Navegação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Veja em tempo real quais produtos seus clientes estão visualizando
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            Visitantes Únicos
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{uniqueVisitors}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Eye className="w-4 h-4" />
            Pageviews
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{pageViews.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShoppingBag className="w-4 h-4" />
            Produtos Vistos
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{uniqueProducts}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="w-4 h-4" />
            Estados
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{Object.keys(states).length}</p>
        </Card>
      </div>

      {/* Manual Email Binding */}
      <Card className="p-4 border-primary/20">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Vincular Email ao Visitante
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Vincule manualmente um email a um visitor_id para que a jornada de visita consiga enviar emails.
          Útil quando o visitante não está logado na loja.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={bindVisitorId}
              onChange={(e) => setBindVisitorId(e.target.value)}
            >
              <option value="">Selecione um visitante...</option>
              {uniqueVisitorIds.map(vid => {
                const pv = pageViews.find(p => p.visitor_id === vid);
                return (
                  <option key={vid} value={vid}>
                    {vid.substring(0, 12)}... {pv?.customer_email ? `(${pv.customer_email})` : "(sem email)"}
                  </option>
                );
              })}
            </select>
          </div>
          <Input
            placeholder="Email do visitante"
            type="email"
            value={bindEmail}
            onChange={(e) => setBindEmail(e.target.value)}
            className="h-9"
          />
          <Input
            placeholder="Nome (opcional)"
            value={bindName}
            onChange={(e) => setBindName(e.target.value)}
            className="h-9"
          />
          <Button
            onClick={handleBindEmail}
            disabled={isBinding || !bindVisitorId || !bindEmail}
            className="h-9 gap-2"
          >
            <Mail className="w-4 h-4" />
            {isBinding ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Produtos Mais Vistos
          </h3>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum produto visualizado ainda</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map(([id, p]) => (
                <div key={id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p.category && <span>{p.category}</span>}
                      {p.price && <span>R$ {p.price.toFixed(2)}</span>}
                    </div>
                  </div>
                  <Badge variant="secondary">{p.count} views</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top States */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Estados com Mais Acessos
          </h3>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>
          ) : topStates.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado de estado ainda</p>
          ) : (
            <div className="space-y-2">
              {topStates.map(([state, count]) => (
                <div key={state} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-sm font-medium text-foreground">{state}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Live Feed */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Feed em Tempo Real
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto, cliente, visitor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma visita registrada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Instale o pixel de rastreamento na sua loja</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.slice(0, 50).map((pv) => (
              <div key={pv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                {getDeviceIcon(pv.device_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {pv.customer_name || pv.visitor_id.substring(0, 8)}
                    </span>
                    {pv.customer_email && (
                      <Badge variant="default" className="text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        {pv.customer_email}
                      </Badge>
                    )}
                    {pv.state && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {pv.state}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {pv.product_name ? (
                      <span className="text-primary font-medium">🛍 {pv.product_name}</span>
                    ) : (
                      pv.page_title || pv.page_url
                    )}
                    <span className="ml-2 opacity-50">({pv.visitor_id.substring(0, 8)})</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(pv.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pixel Script */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Script de Rastreamento (Pixel)
          </h3>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Cole este script no HTML da sua loja Nuvemshop (Layout &gt; Editar código &gt; antes do <code>&lt;/body&gt;</code>). 
          Substitua <code>SEU_SHOP_ID</code> pelo ID da sua loja.
        </p>
        <pre className="bg-secondary/50 rounded-lg p-3 text-xs overflow-x-auto text-foreground">
          {pixelScript}
        </pre>
      </Card>
    </div>
  );
}
