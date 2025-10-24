import type { Metadata } from "next";

import { ManageConnectionsView } from "@/components/ManageConnectionsView";

export const metadata: Metadata = {
  title: "Manage Connections",
};

export default function ConnectionsPage() {
  return <ManageConnectionsView />;
}
