import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DailyMissionAdmin } from "@/components/daily-mission-admin";
import { RafagaAdminPanel } from "@/components/rafaga-admin-panel";

export default function AdminMisionesPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Panel admin
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">📸 Misiones Diarias</CardTitle>
          <CardDescription>
            Publicá la misión del día (los participantes pueden responder con captura, link o texto).
            Aceptar deja la respuesta como cumplida y borra el contenido; rechazar resta los puntos y
            la persona puede reintentar. Al publicar una nueva misión se limpian las respuestas anteriores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyMissionAdmin />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">⚡ Misiones Ráfaga</CardTitle>
          <CardDescription>
            Programá misiones de ventana corta. Los participantes las ven en Misiones Extra y pueden
            reclamar los puntos durante la ventana. Nada se muestra hasta que empiece.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RafagaAdminPanel />
        </CardContent>
      </Card>
    </div>
  );
}
