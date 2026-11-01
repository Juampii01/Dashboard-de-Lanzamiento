import { Mail, BellRing, UserPlus, Megaphone, LifeBuoy, Camera, PanelTop } from "lucide-react";
import { MagicBlastPanel } from "@/components/magic-blast-panel";
import { ReminderBlastPanel } from "@/components/reminder-blast-panel";
import { MentoriaBlastPanel } from "@/components/mentoria-blast-panel";
import { PageHeader, Panel } from "../_components/ui";
import { RegistroLinkPanel, SupportWhatsappPanel, MentoriaBannerPanel, StoryCopySettingsPanel } from "../_components/panels";

export default function ComunicacionesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Durante el challenge"
        title="Comunicaciones"
        description="Todos los envíos masivos en un solo lugar. Regla de oro: prueba siempre con tu email antes de mandar a todos."
      />

      <div className="space-y-6">
        <Panel
          icon={LifeBuoy}
          title="Número de soporte"
          description="WhatsApp al que los participantes pueden escribir desde el botón “Ayuda” cuando la guía no resuelve su duda."
        >
          <SupportWhatsappPanel />
        </Panel>

        <Panel
          icon={PanelTop}
          title="Banner de la mentoría en el inicio"
          description="Apagado por ahora (pedido de Santo, 31/10). Se puede prender el último día del lanzamiento."
        >
          <MentoriaBannerPanel />
        </Panel>

        <Panel
          icon={Camera}
          title="Historia diaria en Instagram"
          description="La guía genera el texto para que cada participante comparta su avance. Aquí defines a quién etiquetar y un texto de referencia (el que arme Stefany)."
        >
          <StoryCopySettingsPanel />
        </Panel>

        <Panel
          icon={Mail}
          title="Acceso por magic link"
        >
          <MagicBlastPanel />
        </Panel>

        <Panel
          icon={BellRing}
          title="Recordatorios de acceso y Día 1"
          description="Sale de otro remitente que el magic link, para que no se agrupen en el mismo hilo."
        >
          <ReminderBlastPanel />
        </Panel>

        <Panel
          icon={Megaphone}
          tone="gold"
          title="Propuesta de mentoría"
        >
          <MentoriaBlastPanel />
        </Panel>

        <Panel
          icon={UserPlus}
          title="Link de registro gratuito"
          description="Quien se registra por aquí queda como usuario gratuito: usa todo el dashboard y suma puntos, pero no compite por premios. Crea su cuenta con email y contraseña y entra al instante."
        >
          <RegistroLinkPanel />
        </Panel>
      </div>
    </>
  );
}
