import { createFileRoute, Outlet } from "@tanstack/react-router";
import { EclipseApp } from "@/components/eclipse-app";
import { AuthGate } from "@/components/auth-gate";
import { BootScreen } from "@/components/boot-screen";

// One persistent app shell for "/" and "/coach/*": switching between them never
// remounts the session or the saved data. Child routes only carry URL + head().
export const Route = createFileRoute("/_shell")({
  ssr: false,
  pendingComponent: BootScreen,
  component: () => <><AuthGate><EclipseApp /></AuthGate><Outlet /></>,
});
