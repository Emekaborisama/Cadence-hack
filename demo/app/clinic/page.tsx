import ClinicView from "@/components/ClinicView";

// Thin server-component wrapper. The interactive UI lives in a client
// component so the route's default export stays a server component —
// avoids the intermittent RSC client-manifest resolution error in Next 16.
export default function ClinicPage() {
  return <ClinicView />;
}
