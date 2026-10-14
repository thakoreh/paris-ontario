import { ProfileHub } from "@/components/profile-hub";
import { privateRouteMetadata } from "@/lib/seo";
export const metadata = privateRouteMetadata("Your profile");
export default function Page() {
  return <ProfileHub />;
}
