import Library from "./components/Library";
import { requireChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <Library displayName={user.fullName ?? "Personal library"} />;
}
