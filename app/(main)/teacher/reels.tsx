import ReelComposer from "../../../src/components/ReelComposer";
import { useSession } from "../../../src/store/session";

// Teachers compose from their assigned section's photos.
export default function TeacherReels() {
  const { session } = useSession();
  return <ReelComposer sectionId={session?.sectionId || undefined} />;
}
