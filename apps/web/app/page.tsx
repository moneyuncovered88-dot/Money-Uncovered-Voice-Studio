import { redirect } from "next/navigation";

// The root simply routes into the app; middleware handles auth gating.
export default function Home() {
  redirect("/dashboard");
}
