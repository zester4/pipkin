import { createFileRoute } from "@tanstack/react-router";
import { PipkinApp } from "@/components/pipkin-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <PipkinApp />;
}
