import { permanentRedirect } from "next/navigation";

export default function LegacyHistoryPage() {
  permanentRedirect("/");
}
