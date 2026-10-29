import { PageHeader } from "../_components/ui";
import { ComentariosClient } from "./client";

export default function ComentariosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Durante el challenge"
        title="Comentarios"
        description="Marca con estrella los mejores comentarios y archiva los del lanzamiento anterior. Nada se borra: los archivados destacados se siguen mostrando en el dashboard como “lanzamiento anterior”."
      />
      <ComentariosClient />
    </>
  );
}
