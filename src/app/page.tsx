import { getWorkspace } from "@/lib/data";
import { JourneyApp } from "@/components/journey-app";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const workspace = await getWorkspace();
  return <JourneyApp initialData={workspace} />;
}
