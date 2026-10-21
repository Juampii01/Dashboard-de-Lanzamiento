import { createServiceClient } from "@/lib/supabase/server";
import { Video, PlayCircle, Clapperboard } from "lucide-react";
import { ContentAdminClient } from "./client";
import { PageHeader, Panel } from "../_components/ui";
import { RecordingsAdminPanel, TutorialAdminPanel } from "../_components/panels";

export const dynamic = "force-dynamic";

interface Quiz {
  id: string;
  capsule_id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  xp_reward: number;
  question_order: number;
}

interface Capsule {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  youtube_url: string;
  podcast_url: string | null;
  video_type: string;
  orientation: string;
  duration_seconds: number | null;
  points_reward: number;
  sort_order: number;
  quizzes: Quiz[];
}

interface Day {
  day_number: number;
  capsules: Capsule[];
}

async function getData(): Promise<Day[]> {
  const service = createServiceClient();

  const [{ data: capsules }, { data: quizzes }] = await Promise.all([
    service
      .from("video_capsules")
      .select("id, day_number, title, description, youtube_url, podcast_url, video_type, orientation, duration_seconds, points_reward, sort_order")
      .order("day_number", { ascending: true })
      .order("sort_order",  { ascending: true }),
    service
      .from("video_quizzes")
      .select("id, capsule_id, question, options, correct_option_index, xp_reward, question_order")
      .order("capsule_id",     { ascending: true })
      .order("question_order", { ascending: true }),
  ]);

  const typedQuizzes = (quizzes ?? []) as unknown as Quiz[];
  const typedCapsules = (capsules ?? []) as unknown as (Capsule & { day_number: number })[];

  const quizByCapsule: Record<string, Quiz[]> = {};
  for (const q of typedQuizzes) {
    if (!quizByCapsule[q.capsule_id]) quizByCapsule[q.capsule_id] = [];
    quizByCapsule[q.capsule_id]!.push(q);
  }

  const dayMap: Record<number, Capsule[]> = {};
  for (const c of typedCapsules) {
    if (!dayMap[c.day_number]) dayMap[c.day_number] = [];
    dayMap[c.day_number]!.push({ ...c, quizzes: quizByCapsule[c.id] ?? [] });
  }

  return Object.entries(dayMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([d, caps]) => ({ day_number: Number(d), capsules: caps }));
}

export default async function ContenidoPage() {
  const days = await getData();
  return (
    <>
      <PageHeader
        eyebrow="Durante el challenge"
        title="Contenido"
        description="Videos y quizzes de cada día, grabaciones de las clases y el tutorial de inicio. Los cambios se guardan al instante."
      />
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            icon={Clapperboard}
            title="Grabaciones de las clases"
            description="Aparecen como botones al lado de los puntos en el dashboard; cada uno abre su grabación en otra pestaña."
          >
            <RecordingsAdminPanel />
          </Panel>
          <Panel
            icon={PlayCircle}
            title="Tutorial de inicio"
            description="Video que se ve en el inicio del dashboard. Vacío = “Próximamente”."
          >
            <TutorialAdminPanel />
          </Panel>
        </div>
        <Panel icon={Video} title="Videos y quizzes por día" description="Editá URL, tipo, orientación y preguntas de cada cápsula.">
          <ContentAdminClient days={days} />
        </Panel>
      </div>
    </>
  );
}
