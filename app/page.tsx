import Library from "./components/Library";
import { requireUser, signOutPath } from "../lib/auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await requireUser("/");
  return (
    <Library
      displayName={user.fullName ?? "Personal library"}
      signOutPath={signOutPath()}
    />
  );
}
