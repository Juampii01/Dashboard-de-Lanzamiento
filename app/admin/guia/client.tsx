"use client";

import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "usuario" | "admin" | "barra" | "videos" | "quiz" | "xp";

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
}) {
  const colors = {
    blue:   "bg-blue-100 text-blue-800 border border-blue-200",
    green:  "bg-green-100 text-green-800 border border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    red:    "bg-red-100 text-red-800 border border-red-200",
    purple: "bg-purple-100 text-purple-800 border border-purple-200",
    gray:   "bg-gray-100 text-gray-700 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {n}
      </div>
      <div className="flex-1 pb-6 border-b border-border last:border-0 last:pb-0">
        <p className="font-semibold text-sm mb-1">{title}</p>
        <div className="text-sm text-muted-foreground space-y-1">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 bg-muted/40 border-b flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="font-bold text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function InfoBox({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "tip" }) {
  const styles = {
    info:    "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    tip:     "bg-green-50 border-green-200 text-green-800",
  };
  const icons = { info: "ℹ️", warning: "⚠️", tip: "💡" };
  return (
    <div className={`flex gap-2 p-3 rounded-lg border text-sm ${styles[type]}`}>
      <span className="shrink-0">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground border-b">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 border-b border-border/50 last:border-b-0 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function TabUsuario() {
  return (
    <div className="space-y-6">

      <Section title="Experiencia del Participante — Flujo Completo" icon="🧑‍🎓">
        <p className="text-sm text-muted-foreground">
          Esto es lo que vive un usuario desde que recibe su acceso hasta que completa el challenge.
        </p>
        <div className="space-y-0">
          <Step n={1} title="Recibe el magic link por email">
            <p>Al ser creado desde el panel admin (/admin/usuarios/nuevo), Supabase envía automáticamente
              un email con un link de acceso de un solo uso. El usuario hace clic en ese link y queda
              autenticado sin necesidad de contraseña.</p>
            <InfoBox type="info">El link expira a los 60 minutos. Si el usuario no lo usó, hay que regenerarlo
              desde Supabase Dashboard → Authentication → Users.</InfoBox>
          </Step>

          <Step n={2} title="Ve el Dashboard Principal">
            <p>
              Al ingresar ve la pantalla principal con:
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1 mt-1">
              <li><strong>4 tarjetas de días</strong> — Día 1 siempre desbloqueado, Días 2-4 se van abriendo</li>
              <li><strong>Timer de acceso</strong> — muestra cuántos días le quedan de acceso al challenge</li>
              <li><strong>Tabla de líderes</strong> — ranking en tiempo real actualizado cada 60s</li>
              <li><strong>Barra inferior</strong> — progreso (días completados) + combo bar</li>
              <li><strong>Contratos SAM.gov</strong> — widget con datos de contratos federales en su sector</li>
            </ul>
          </Step>

          <Step n={3} title="Completa el Día 1 — Perfil Estratégico">
            <p>El Día 1 tiene dos partes:</p>
            <ul className="list-disc list-inside ml-2 space-y-1 mt-1">
              <li><strong>Videos (Cápsulas):</strong> lista de videos en la sección "Misiones en Video". Cada uno
                tiene su botón <Badge color="blue">▶ Hacer misión</Badge>. El usuario lo mira, al terminar puede marcarlo como visto
                y aparece un <strong>quiz</strong> de preguntas sobre el video.</li>
              <li><strong>Formulario de empresa:</strong> completa datos de su empresa. Una IA sugiere el código
                NAICS correcto. Al guardar y hacer clic en "Completar Día", gana <Badge color="yellow">+50 XP</Badge> y se desbloquea el Día 2.</li>
            </ul>
          </Step>

          <Step n={4} title="Completa los Días 2, 3 y 4">
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong>Día 2 — Mapa de Códigos:</strong> AI expande los códigos NAICS relacionados, genera PDF</li>
              <li><strong>Día 3 — Web + Portales:</strong> preview de web gubernamental, información de portales de registro</li>
              <li><strong>Día 4 — Capability Statement:</strong> genera el documento oficial del negocio, habilita los premios finales</li>
            </ul>
            <p className="mt-1">Cada día que se completa llena un segmento de la barra inferior.</p>
          </Step>

          <Step n={5} title="Sistema de Premios">
            <p>Al completar el Día 4, puede subir sus entregables y competir por los premios finales. Más XP acumulados
              = mejor posición en el ranking. Los mejores ranqueados al cierre del challenge ganan premios reales.</p>
          </Step>
        </div>
      </Section>

      <Section title="Pantalla del Dashboard — Elementos Clave" icon="🖥️">
        <Table
          headers={["Elemento", "Dónde está", "Qué hace"]}
          rows={[
            ["Logo + Countdown", "Header superior izquierda", "Logo de GovBidder. El countdown muestra días restantes de acceso."],
            ["XP Pill 💎", "Header superior derecha", "Muestra los puntos acumulados. Al ganar XP, hace un flip animado. Clic para ver desglose."],
            ["Botón perfil 👤", "Header superior derecha", "Abre panel de perfil. Desde ahí puede cambiar su avatar (foto de perfil)."],
            ["4 Tarjetas de Días", "Centro del dashboard", "Cada tarjeta = un día del challenge. Clic para entrar al día (si está desbloqueado)."],
            ["Tabla de Líderes 🏆", "Lado derecho", "Ranking de participantes por XP. Actualizado cada 60s. Nombre enmascarado por privacidad."],
            ["Barra de Progreso", "Barra inferior", "4 segmentos, uno por día completado. Con avatar de Santo clickeable."],
            ["Combo Bar", "Debajo de la barra", "Barra que se llena con actividad. Al llegar al 100% aparece botón para reclamar +50 XP."],
          ]}
        />
      </Section>

      <Section title="Dentro de un Día — Elementos Clave" icon="📅">
        <Table
          headers={["Elemento", "Descripción"]}
          rows={[
            ["Sección de Videos 📺", "Lista de cápsulas de video para ese día. Cada una tiene su botón 'Hacer misión'."],
            ["Modal de Video", "Se abre al hacer clic. Reproduce el video de YouTube. Al terminar se habilita 'Marcar como vista'."],
            ["Quiz después del video", "Modal con preguntas de opción múltiple. Obligatorio completarlo para ganar el XP del quiz."],
            ["Formulario del día", "El ejercicio principal del día (diferente en cada día)."],
            ["Botón 'Completar Día'", "Aparece cuando el usuario completó los requisitos del día. Otorga +50 XP y desbloquea el día siguiente."],
          ]}
        />
        <InfoBox type="tip">
          El usuario puede ver los videos sin completar el formulario, y viceversa. El botón &quot;Completar Día&quot;
          solo aparece cuando cumplió los requisitos mínimos del día.
        </InfoBox>
      </Section>

    </div>
  );
}

function TabAdmin() {
  return (
    <div className="space-y-6">

      <Section title="Panel Principal — /admin" icon="🛡️">
        <p className="text-sm text-muted-foreground">
          Accesible desde el header del dashboard o directamente en <code className="bg-muted px-1 rounded">/admin</code>.
          Solo los usuarios con <Badge color="purple">is_admin = true</Badge> pueden entrar.
        </p>

        <div className="space-y-4">
          <div>
            <p className="font-semibold text-sm mb-2">🔒 Dashboard Lock (Bloqueo en vivo)</p>
            <p className="text-sm text-muted-foreground mb-2">
              Cuando hay una llamada en vivo, podés activar el Lock del dashboard. Todos los usuarios
              verán una pantalla de espera con el mensaje que configures y un botón para unirse a la llamada.
            </p>
            <Table
              headers={["Campo", "Para qué sirve"]}
              rows={[
                ["Activar lock", "Bloquea el dashboard para todos (excepto admins) mientras dura la llamada"],
                ["URL de la llamada", "Link de Zoom/Meet que aparece en el botón 'Unirse ahora'"],
                ["Mensaje personalizado", "Texto que ven los usuarios en la pantalla de espera"],
                ["Desactivar lock", "Los usuarios vuelven al dashboard normal"],
              ]}
            />
            <InfoBox type="warning">
              Al activar el lock, los usuarios que estén navegando en ese momento ven la pantalla de espera
              automáticamente (polling cada 20 segundos).
            </InfoBox>
          </div>

          <div>
            <p className="font-semibold text-sm mb-2">🗓️ Toggles de Días (Apertura global)</p>
            <p className="text-sm text-muted-foreground mb-2">
              Controlás cuándo se abre cada día del challenge para todos los usuarios.
            </p>
            <Table
              headers={["Día", "Tema", "Cuándo activar"]}
              rows={[
                ["Día 1 — Perfil Estratégico", "NAICS + perfil de empresa", "Al inicio del challenge (ya desbloqueado por defecto)"],
                ["Día 2 — Mapa de Códigos", "Expansión de códigos NAICS", "Cuando la mayoría completó el Día 1"],
                ["Día 3 — Web + Portales", "Presencia web y portales", "Cuando la mayoría completó el Día 2"],
                ["Día 4 — Capability Statement", "Documento oficial + sorteo", "Último día del challenge"],
              ]}
            />
            <InfoBox type="info">
              El toggle activa el día solo para usuarios que ya completaron el día anterior.
              Un usuario que no completó el Día 1 no ve el Día 2 aunque el toggle esté activado.
            </InfoBox>
          </div>

          <div>
            <p className="font-semibold text-sm mb-2">👥 Tabla de Progreso de Usuarios</p>
            <p className="text-sm text-muted-foreground mb-2">
              Muestra todos los usuarios registrados con su progreso en tiempo real.
            </p>
            <Table
              headers={["Columna / Acción", "Significado"]}
              rows={[
                ["Email + Nombre", "Datos del participante"],
                ["XP Total", "Puntos acumulados en todo el challenge"],
                ["D1 / D2 / D3 / D4", "✅ = día completado, 🔓 = desbloqueado (sin completar), 🔒 = bloqueado"],
                ["Estado (Active/Expired)", "Active = acceso vigente, Expired = vencido"],
                ["Botones de override", "Desbloquear / bloquear un día específico para un usuario individual"],
                ["Botón ↺ Reset", "Resetea todo el progreso del usuario (borra dias, XP, vuelve a 0)"],
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Crear Usuarios — /admin/usuarios/nuevo" icon="➕">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-sm mb-2">Usuario Individual</p>
            <p className="text-sm text-muted-foreground mb-3">Completá el formulario con:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Email</strong> (obligatorio)</li>
              <li>Nombre completo</li>
              <li>Teléfono (solo metadata interna)</li>
              <li>Fecha de vencimiento (default: 30 días)</li>
              <li>Es administrador (checkbox)</li>
              <li>Notas internas (ej: &quot;comprado por WhatsApp&quot;)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Al crear, Supabase envía automáticamente el magic link al email.
            </p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-2">Carga Masiva (CSV)</p>
            <p className="text-sm text-muted-foreground mb-3">Para múltiples usuarios a la vez. Formato del CSV:</p>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs">
              <p>email,full_name,phone,expires_at,notes</p>
              <p>juan@empresa.com,Juan Pérez,+54911...,2026-06-30,WhatsApp</p>
              <p>maria@firma.com,María García,,2026-06-30,</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Máximo 200 usuarios por lote. Cada usuario recibe su magic link individualmente.
            </p>
          </div>
        </div>
        <InfoBox type="tip">
          El magic link expira en 60 minutos. Si el usuario no lo usó, regeneralo desde
          Supabase Dashboard → Authentication → Users → enviar email de recuperación.
        </InfoBox>
      </Section>

      <Section title="Gestionar Contenido — /admin/contenido" icon="🎬">
        <p className="text-sm text-muted-foreground">
          Desde esta página cargás los videos y creás las preguntas del quiz para cada día.
          Ver las secciones <strong>Videos y Cápsulas</strong> y <strong>Quiz</strong> para detalles completos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 space-y-1">
            <p className="font-semibold text-sm">Videos por día</p>
            <p className="text-sm text-muted-foreground">
              Cada día puede tener múltiples cápsulas de video. Se muestran en orden y el usuario
              las puede hacer una por una.
            </p>
          </div>
          <div className="border rounded-lg p-4 space-y-1">
            <p className="font-semibold text-sm">Quiz por video</p>
            <p className="text-sm text-muted-foreground">
              Cada video puede tener 1 o más preguntas de opción múltiple que aparecen
              después de que el usuario marca el video como visto.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
}

function TabBarra() {
  return (
    <div className="space-y-6">

      <Section title="Barra de Progreso (Segmentos de Días)" icon="📊">
        <p className="text-sm text-muted-foreground">
          La barra horizontal en la parte inferior muestra el avance del participante en el challenge.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Día 1\nPerfil Estratégico", "Día 2\nMapa de Códigos", "Día 3\nWeb + Portales", "Día 4\nCapability Statement"].map((label, i) => (
            <div key={i} className="border rounded-lg p-3 text-center space-y-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(i + 1) * 25}%`,
                    background: "linear-gradient(90deg, #00D67A, #00A85A)",
                  }}
                />
              </div>
              <p className="text-xs font-medium whitespace-pre-line">{label}</p>
              <Badge color={i === 0 ? "green" : i === 1 ? "blue" : i === 2 ? "purple" : "yellow"}>
                Segmento {i + 1}
              </Badge>
            </div>
          ))}
        </div>
        <Table
          headers={["Estado del segmento", "Visual", "Condición"]}
          rows={[
            ["Bloqueado 🔒", "Gris / oscuro", "El día no fue desbloqueado por el admin todavía"],
            ["Desbloqueado 🔓", "Azul animado", "El admin activó el toggle del día"],
            ["Completado ✅", "Verde sólido", "El usuario completó ese día del challenge"],
          ]}
        />
      </Section>

      <Section title="Avatar de Santo (Clickeable)" icon="🦅">
        <p className="text-sm text-muted-foreground">
          El avatar en la barra de progreso (por defecto el águila de GovBidder) es interactivo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Cómo funciona</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>El usuario hace clic en el avatar</li>
              <li>Aparecen partículas y gana <Badge color="yellow">+3 XP</Badge></li>
              <li>El avatar salta con animación</li>
              <li>Cooldown de <strong>60 minutos</strong> entre clicks</li>
              <li>Durante el cooldown aparece un candado 🔒</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-sm">Avatar personalizado</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>El usuario puede subir su propia foto</li>
              <li>Ícono de cámara aparece al hacer hover</li>
              <li>Se muestra en lugar del logo por defecto</li>
              <li>Tamaño máximo: 2MB (JPG, PNG, WebP)</li>
              <li>Se recorta en forma circular automáticamente</li>
            </ul>
          </div>
        </div>
        <InfoBox type="info">
          Los admins no tienen cooldown — pueden hacer clic infinitas veces para probar el sistema.
        </InfoBox>
      </Section>

      <Section title="Combo Bar (Barra de Combos)" icon="⚡">
        <p className="text-sm text-muted-foreground">
          La barra delgada debajo de la barra de progreso se llena con la actividad del usuario en el challenge.
          Cuando llega al 100%, puede reclamar un bonus de <Badge color="yellow">+50 XP</Badge>.
        </p>

        <div className="space-y-3">
          <p className="font-semibold text-sm">Cómo se llena el Combo</p>
          <Table
            headers={["Acción del usuario", "Combo que suma", "XP que da"]}
            rows={[
              ["Ver y marcar un video como visto", "+20% combo", "+10 XP"],
              ["Completar un día", "+30% combo", "+50 XP"],
              ["Hacer clic en el avatar de Santo", "+5% combo", "+3 XP"],
              ["Heartbeat (tiempo activo, cada 10 min)", "+10% combo", "+2 a 5 XP"],
            ]}
          />

          <p className="font-semibold text-sm">Colores de la barra según el nivel</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "0–59%", color: "#00D67A", desc: "Verde — progresando" },
              { label: "60–99%", color: "#00D4FF", desc: "Cian — casi llena" },
              { label: "100%", color: "#FFD700", desc: "Dorado — ¡BONUS listo!" },
            ].map((item, i) => (
              <div key={i} className="border rounded-lg p-3 text-center space-y-2">
                <div className="h-2 rounded-full" style={{ background: item.color }} />
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <InfoBox type="tip">
            Cuando el combo llega al 100%, la barra se convierte en un botón dorado que dice
            &quot;🎁 +50 XP — ¡Reclamar Combo!&quot;. Al hacer clic, el usuario recibe los 50 XP
            y el combo se resetea a 0 para volver a llenarse.
          </InfoBox>
        </div>
      </Section>

    </div>
  );
}

function TabVideos() {
  return (
    <div className="space-y-6">

      <Section title="Cargar Videos — /admin/contenido" icon="📹">
        <p className="text-sm text-muted-foreground">
          Los videos se llaman <strong>Cápsulas</strong>. Cada día del challenge puede tener múltiples cápsulas.
          Para cargarlas, ir a <code className="bg-muted px-1 rounded">/admin/contenido</code>.
        </p>

        <div className="space-y-4">
          <div>
            <p className="font-semibold text-sm mb-2">Campos de cada cápsula</p>
            <Table
              headers={["Campo", "Qué es", "Ejemplo"]}
              rows={[
                ["Título", "Nombre del video que ve el usuario", "Cómo encontrar contratos en SAM.gov"],
                ["URL de YouTube", "Link del video. Usar formato youtu.be o youtube.com/watch?v=", "https://youtu.be/abc123"],
                ["Tipo", "Normal (video) o Podcast (audio)", "Normal"],
                ["Orientación", "Horizontal (16:9) o Vertical (9:16, Reels/TikTok)", "Horizontal"],
                ["Duración (segundos)", "Largo del video. El sistema lo usa de fallback si YouTube no reporta el fin", "1800 (30 min)"],
                ["Puntos", "XP que gana el usuario al marcar el video como visto", "10"],
                ["Orden", "Número que define el orden dentro del día (1, 2, 3...)", "1"],
              ]}
            />
          </div>

          <InfoBox type="tip">
            Para obtener el link de YouTube: en el video → botón Compartir → Copiar enlace.
            El formato corto <code>youtu.be/XXXXXX</code> funciona perfectamente.
          </InfoBox>

          <div>
            <p className="font-semibold text-sm mb-2">Tipo Podcast</p>
            <p className="text-sm text-muted-foreground">
              Si el tipo es <strong>Podcast</strong>, el campo URL puede apuntar a Spotify, RSS, o cualquier
              player embebible. El usuario ve un botón especial:
              <Badge color="purple"> 🎙 Escuché el podcast completo → +30 XP</Badge>.
              El claim es único por usuario por cápsula.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Cómo Ve el Usuario los Videos" icon="▶️">
        <div className="space-y-4">
          <div className="space-y-0">
            <Step n={1} title="Ve la lista de cápsulas del día">
              <p>En cada página de día (ej: /dashboard/dia-1), la sección &quot;Misiones en Video&quot; muestra
                todas las cápsulas de ese día en orden. Cada una tiene:</p>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                <li>Título del video</li>
                <li>Badge del tipo (📹 Video o 🎙 Podcast)</li>
                <li>XP que va a ganar</li>
                <li>Botón <Badge color="blue">▶ Hacer misión</Badge> (o <Badge color="green">✓ Hecha</Badge> si ya la completó)</li>
              </ul>
            </Step>

            <Step n={2} title="Hace clic en 'Hacer misión'">
              <p>Se abre un modal con el player de YouTube. El video empieza a reproducirse.</p>
              <InfoBox type="info">
                El botón &quot;Marcar como vista&quot; está deshabilitado mientras el video está reproduciéndose.
                Se habilita cuando YouTube reporta que el video terminó, o después de un tiempo mínimo
                (30 segundos o la duración configurada, lo que sea menor).
              </InfoBox>
            </Step>

            <Step n={3} title="Marca el video como visto">
              <p>Hace clic en &quot;Marcar como vista&quot;. El sistema registra la compleción y le asigna los puntos
                configurados (ej: +10 XP). El modal se cierra y <strong>aparece automáticamente el quiz</strong>
                si hay preguntas cargadas para esa cápsula.</p>
            </Step>

            <Step n={4} title="Responde el quiz (si hay preguntas)">
              <p>Ver la sección <strong>Quiz</strong> para el detalle completo de este paso.</p>
            </Step>
          </div>

          <div>
            <p className="font-semibold text-sm mb-2">Cooldown entre videos</p>
            <p className="text-sm text-muted-foreground">
              Para evitar que el usuario marque todos los videos sin mirarlos, hay un cooldown global
              de <strong>5 minutos</strong> entre marcaciones. Si intentó reclamar otro video antes de los 5 minutos,
              ve un badge con el tiempo restante. Los admins no tienen cooldown.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Referencia — Estructura de Días y Cápsulas" icon="🗂️">
        <Table
          headers={["Día", "Tema", "Tipo de videos recomendados", "XP sugerido"]}
          rows={[
            ["Día 1 — Perfil Estratégico", "NAICS, oportunidades de gobierno, perfil de empresa", "Videos explicativos, tutoriales", "10 pts/video"],
            ["Día 2 — Mapa de Códigos", "Códigos PSC, UEI, SAM.gov, cómo buscar contratos", "Demos de plataformas, walkthroughs", "10 pts/video"],
            ["Día 3 — Web + Portales", "Presencia web, portales de registro (beta.SAM.gov, SBA)", "Tutoriales de registro", "10 pts/video"],
            ["Día 4 — Capability Statement", "Redacción, diseño, cómo usarlo en ventas", "Ejemplos reales, entrevistas", "10 pts/video"],
          ]}
        />
        <InfoBox type="tip">
          No hay un límite de videos por día. Podés agregar tantas cápsulas como quieras.
          El orden de visualización se controla con el campo &quot;Orden&quot;.
        </InfoBox>
      </Section>

    </div>
  );
}

function TabQuiz() {
  return (
    <div className="space-y-6">

      <Section title="Crear Preguntas de Quiz — /admin/contenido" icon="🧠">
        <p className="text-sm text-muted-foreground">
          Cada cápsula de video puede tener 1 o más preguntas. Las preguntas se crean desde el editor
          de contenido en <code className="bg-muted px-1 rounded">/admin/contenido</code>.
        </p>

        <div className="space-y-4">
          <div>
            <p className="font-semibold text-sm mb-2">Campos de cada pregunta</p>
            <Table
              headers={["Campo", "Descripción", "Ejemplo"]}
              rows={[
                ["Pregunta", "El texto de la pregunta. Hacer referencia al contenido del video.", "¿Cuántos dígitos tiene un código NAICS?"],
                ["Opciones", "Entre 2 y 5 opciones de respuesta", "4 dígitos / 6 dígitos / 8 dígitos / 10 dígitos"],
                ["Respuesta correcta", "Índice de la opción correcta (se marca con un radio button)", "6 dígitos (opción 2)"],
                ["XP por acierto", "Puntos que gana el usuario al responder correctamente. Rango: 0–100.", "10"],
                ["Orden", "Número que define en qué orden aparece la pregunta dentro de la cápsula", "1"],
              ]}
            />
          </div>

          <InfoBox type="tip">
            <strong>Recomendación de contenido:</strong> Las mejores preguntas son aquellas que refuerzan
            un concepto clave del video. Evitar preguntas sobre detalles triviales. 3-5 preguntas
            por video es una buena cantidad para mantener el engagement sin cansar.
          </InfoBox>

          <div>
            <p className="font-semibold text-sm mb-2">Gestión desde /admin/contenido</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Para <strong>crear</strong> una pregunta: clic en el botón &quot;+ Agregar pregunta&quot; debajo de la cápsula</li>
              <li>Para <strong>editar</strong>: directamente en el campo de texto, se guarda con el botón 💾</li>
              <li>Para <strong>eliminar</strong>: botón 🗑️ al lado de la pregunta</li>
              <li>El orden se puede ajustar cambiando el número de pregunta</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Experiencia del Usuario con el Quiz" icon="❓">
        <div className="space-y-4">
          <div className="space-y-0">
            <Step n={1} title="Termina de ver el video">
              <p>El usuario hace clic en &quot;Marcar como vista&quot; al terminar el video.
                Se registra la compleción y los puntos del video se suman a su XP.</p>
            </Step>

            <Step n={2} title="Aparece el modal del quiz">
              <p>Si la cápsula tiene preguntas cargadas, el modal del quiz se abre automáticamente.
                Muestra:</p>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                <li>Número de pregunta actual / total (ej: &quot;Pregunta 1 de 3&quot;)</li>
                <li>Texto de la pregunta</li>
                <li>Las opciones como botones seleccionables</li>
                <li>Botón &quot;Confirmar respuesta&quot;</li>
              </ul>
            </Step>

            <Step n={3} title="Responde la pregunta">
              <p>El usuario selecciona una opción y hace clic en &quot;Confirmar&quot;:</p>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                <li><strong>Correcta:</strong> la opción se pone verde 🟢, aparece el XP ganado, avanza a la siguiente pregunta</li>
                <li><strong>Incorrecta:</strong> la opción se pone roja 🔴, puede volver a intentar sin límite</li>
              </ul>
              <InfoBox type="info">
                El XP solo se otorga la primera vez que responde correctamente. Si ya respondió bien
                esa pregunta en el pasado, el quiz la muestra pero no da XP adicional.
              </InfoBox>
            </Step>

            <Step n={4} title="Completa todas las preguntas">
              <p>Al responder correctamente la última pregunta, aparece una animación de celebración
                y el modal se cierra automáticamente después de 2.5 segundos.</p>
              <InfoBox type="warning">
                El quiz no se puede cerrar hasta completar todas las preguntas. Esto asegura que
                el usuario prestó atención al contenido.
              </InfoBox>
            </Step>
          </div>
        </div>
      </Section>

      <Section title="Guía para Crear Buenas Preguntas" icon="✍️">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-green-200 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-sm text-green-700">✅ Buenas prácticas</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Preguntas claras y directas</li>
              <li>Una sola respuesta correcta sin ambigüedad</li>
              <li>Opciones incorrectas plausibles (no obviamente falsas)</li>
              <li>Referencia a conceptos clave del video</li>
              <li>3-5 preguntas por cápsula</li>
              <li>XP: 10-15 puntos por respuesta correcta</li>
            </ul>
          </div>
          <div className="border border-red-200 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-sm text-red-700">❌ Evitar</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Preguntas con trampa o doble sentido</li>
              <li>Más de 5 preguntas por video (cansa)</li>
              <li>Preguntas sobre detalles irrelevantes</li>
              <li>Opciones obviamente incorrectas</li>
              <li>Preguntas que no se responden viendo el video</li>
            </ul>
          </div>
        </div>

        <div>
          <p className="font-semibold text-sm mb-2">Ejemplo de pregunta bien estructurada</p>
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium">
              📹 Video: &quot;Cómo registrarse en SAM.gov&quot;
            </p>
            <p className="text-sm">
              <strong>Pregunta:</strong> ¿Qué documento necesitás para completar el registro en SAM.gov?
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm"><Badge color="gray">A</Badge> Pasaporte vigente</div>
              <div className="flex items-center gap-2 text-sm"><Badge color="green">B</Badge> EIN (Employer Identification Number) ← correcta</div>
              <div className="flex items-center gap-2 text-sm"><Badge color="gray">C</Badge> Número de licencia de conducir</div>
              <div className="flex items-center gap-2 text-sm"><Badge color="gray">D</Badge> Cuenta bancaria activa</div>
            </div>
            <p className="text-xs text-muted-foreground">XP: 10 pts | Orden: 1</p>
          </div>
        </div>
      </Section>

    </div>
  );
}

function TabXP() {
  return (
    <div className="space-y-6">

      <Section title="Todas las Fuentes de XP" icon="⚡">
        <p className="text-sm text-muted-foreground">
          Tabla completa de cómo los participantes acumulan puntos durante el challenge.
        </p>
        <Table
          headers={["Acción", "XP", "Límite / Cooldown", "Quién puede"]}
          rows={[
            ["Ver y marcar un video como visto", "+10", "5 min entre videos • 1 vez por video", "Todos"],
            ["Responder quiz correctamente", "+10", "1 vez por pregunta", "Todos"],
            ["Completar un día del challenge", "+50", "1 vez por día (no se repite)", "Todos"],
            ["Clic en el avatar de Santo", "+3", "60 minutos entre clicks", "Todos (admins sin cooldown)"],
            ["Podcast: reclamar compleción", "+30", "1 vez por podcast", "Todos"],
            ["Unirse a la llamada en vivo", "+30", "1 vez por llamada por día", "Todos"],
            ["Heartbeat (tiempo activo)", "+2 a 5", "Cada 10 min • máx 3 veces por día", "Todos"],
            ["Combo bonus (barra al 100%)", "+50", "Sin límite (se puede llenar múltiples veces)", "Todos"],
          ]}
        />
        <InfoBox type="info">
          Los puntos del video pueden variar — cada cápsula tiene su propio <code>points_reward</code>
          configurado en el admin. Los +10 son el valor por defecto.
        </InfoBox>
      </Section>

      <Section title="Leaderboard (Tabla de Líderes)" icon="🏆">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-sm mb-2">Cómo funciona</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Muestra el <strong>top 20</strong> de participantes por XP total</li>
              <li>Se actualiza automáticamente <strong>cada 60 segundos</strong></li>
              <li>El usuario actual aparece resaltado en amarillo</li>
              <li>Si está fuera del top 20, su posición se muestra al final con &quot;• • •&quot;</li>
              <li>Los nombres están <strong>parcialmente enmascarados</strong> por privacidad</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm mb-2">Colores por posición</p>
            <div className="space-y-2">
              {[
                { pos: "#1", color: "#FFD700", label: "Oro" },
                { pos: "#2", color: "#C0C0C0", label: "Plata" },
                { pos: "#3", color: "#CD7F32", label: "Bronce" },
                { pos: "#4+", color: "#8DA2C4", label: "Resto" },
              ].map((item) => (
                <div key={item.pos} className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold w-6" style={{ color: item.color }}>{item.pos}</span>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Sistema de Premios" icon="🏆">
        <p className="text-sm text-muted-foreground mb-3">
          Los premios se otorgan a los mejores ranqueados al final del challenge.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center space-y-2">
            <p className="text-2xl font-bold">🥇 #1</p>
            <p className="text-xs text-muted-foreground">Servicio completo «Te conseguimos tu contrato» — $15,000 USD</p>
          </div>
          <div className="border rounded-lg p-4 text-center space-y-2">
            <p className="text-2xl font-bold">🥈 #2</p>
            <p className="text-xs text-muted-foreground">Consultoría 1:1 de 1 hora con Santo (roadmap para venderle al gobierno)</p>
          </div>
          <div className="border rounded-lg p-4 text-center space-y-2">
            <p className="text-2xl font-bold">🏆 #3–12</p>
            <p className="text-xs text-muted-foreground">Auditoría con el Team GovBidder (roadmap para venderle al gobierno)</p>
          </div>
        </div>
        <InfoBox type="tip">
          Para competir por los premios el usuario debe completar el Día 4. Una vez completado,
          puede subir sus entregables desde la pantalla del Día 4.
        </InfoBox>
        <p className="text-sm text-muted-foreground">
          Más XP acumulados = mejor posición en el ranking. Los participantes más activos tienen
          mejor posición para ganar los premios finales.
        </p>
      </Section>

      <Section title="Heartbeat — XP por Tiempo Activo" icon="💓">
        <p className="text-sm text-muted-foreground mb-3">
          El sistema de heartbeat premia a los usuarios que permanecen activos en el dashboard,
          aunque no estén haciendo click en nada.
        </p>
        <Table
          headers={["Parámetro", "Valor"]}
          rows={[
            ["Frecuencia", "Cada 10 minutos"],
            ["XP por heartbeat", "+2 a +5 (variable, calculado en la DB)"],
            ["Máximo por día", "3 heartbeats (después no se otorga más XP por tiempo)"],
            ["Requisito de actividad", "El usuario debe haber tenido movimiento de mouse/click/scroll en los últimos 5 minutos"],
          ]}
        />
        <InfoBox type="info">
          El heartbeat es invisible — el usuario no ve ningún mensaje cuando se otorga, solo ve
          que sus puntos aumentaron ligeramente en el pill de XP.
        </InfoBox>
      </Section>

    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "usuario", label: "Vista Usuario",    icon: "🧑‍🎓" },
  { id: "admin",   label: "Vista Admin",      icon: "🛡️" },
  { id: "barra",   label: "Barra Inferior",   icon: "📊" },
  { id: "videos",  label: "Videos",           icon: "📹" },
  { id: "quiz",    label: "Quiz",             icon: "🧠" },
  { id: "xp",      label: "XP y Premios",      icon: "⚡" },
];

export function GuiaClient() {
  const [activeTab, setActiveTab] = useState<Tab>("usuario");

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Guía del Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Referencia completa del dashboard — cómo funciona para usuarios y administradores.
        </p>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: "/admin",                  label: "Panel Admin",       icon: "🛡️", desc: "Dashboard principal" },
          { href: "/admin/contenido",        label: "Cargar videos",     icon: "📹", desc: "Videos + Quiz" },
          { href: "/admin/usuarios/nuevo",   label: "Crear usuario",     icon: "➕", desc: "Manual o CSV" },
          { href: "/dashboard",              label: "Ver como usuario",  icon: "👁️", desc: "Vista del participante" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="border rounded-lg p-3 flex items-start gap-2.5 hover:bg-muted/50 transition-colors"
          >
            <span className="text-xl shrink-0">{item.icon}</span>
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="border rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto border-b bg-muted/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                activeTab === tab.id
                  ? "bg-background border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "usuario" && <TabUsuario />}
          {activeTab === "admin"   && <TabAdmin />}
          {activeTab === "barra"   && <TabBarra />}
          {activeTab === "videos"  && <TabVideos />}
          {activeTab === "quiz"    && <TabQuiz />}
          {activeTab === "xp"      && <TabXP />}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        GovBidder Challenge · Panel Admin · Esta guía es solo visible para administradores
      </p>
    </div>
  );
}
