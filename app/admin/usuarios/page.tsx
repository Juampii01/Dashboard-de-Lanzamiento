import { getUsersAndProgress } from "../_lib/data";
import { UsersClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const { users, allProgress, sorteos } = await getUsersAndProgress();
  return <UsersClient users={users} allProgress={allProgress} sorteos={sorteos} />;
}
