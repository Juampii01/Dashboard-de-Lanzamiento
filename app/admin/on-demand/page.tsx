import { PageHeader } from "../_components/ui";
import { OndemandAdminClient } from "./client";

export const dynamic = "force-dynamic";

export default function OndemandAdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="On Demand"
        title="Versión grabada"
        description="Misiones fijas, premios por puntos y compras que llegan desde GoHighLevel. Las grabaciones de On Demand se cargan en Contenido."
      />
      <OndemandAdminClient />
    </>
  );
}
