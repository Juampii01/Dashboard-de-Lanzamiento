import { GuiaClient } from "./client";

export const metadata = {
  title: "Guía del Sistema — Panel Admin",
};

export default function GuiaPage() {
  // Auth is handled by app/admin/layout.tsx (redirects if not is_admin)
  return <GuiaClient />;
}
