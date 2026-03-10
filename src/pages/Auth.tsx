import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    return digits.slice(0, 11);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      toast.error("Digite um número de telefone válido");
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = `+55${phone}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        console.error("OTP error:", error);
        toast.error(error.message || "Erro ao enviar código");
      } else {
        toast.success("Código enviado para seu WhatsApp!");
        setStep("otp");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Erro ao enviar código");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      toast.error("Digite o código completo");
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = `+55${phone}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (error) {
        console.error("Verify error:", error);
        toast.error(error.message || "Código inválido");
      } else {
        toast.success("Login realizado com sucesso!");
        navigate("/inbox");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Erro ao verificar código");
    } finally {
      setIsLoading(false);
    }
  };

  const displayPhone = phone
    ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
    : "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === "phone" ? "Entrar" : "Verificar código"}
          </CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Digite seu número de WhatsApp para continuar"
              : `Enviamos um código para ${displayPhone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Número de WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={displayPhone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas números do Brasil (+55)
                </p>
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={isLoading || phone.length < 10}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continuar
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <Label>Código de verificação</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length < 6}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Verificar
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                }}
                className="w-full"
              >
                Alterar número
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
