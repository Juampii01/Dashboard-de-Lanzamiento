import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function ExpiradoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-lg shadow-2xl text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Tu acceso al Challenge expiró</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            La ventana de 7 días del Govbidder Code Challenge terminó. Pero lo que
            aprendiste es tuyo para siempre.
          </p>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 text-left space-y-3">
            <p className="font-bold text-lg">¿Querés ir al siguiente nivel?</p>
            <p className="text-muted-foreground text-sm">
              En la mentoría premium{" "}
              <strong>"Tu Primer Contrato"</strong> trabajás uno a uno con el
              equipo de Govbidder para conseguir tu primer contrato federal real.
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✅ Número 1-800 profesional</li>
              <li>✅ Tabulador de contratos y bid packets</li>
              <li>✅ Análisis de oportunidades activas en SAM.gov</li>
              <li>✅ Acompañamiento hasta el primer contrato</li>
            </ul>
          </div>

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base h-12"
            asChild
          >
            <a href="https://govbidder.com/mentoria" target="_blank" rel="noopener noreferrer">
              Quiero mi primer contrato federal →
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
