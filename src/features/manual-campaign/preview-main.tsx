// DEV PREVIEW ONLY: npm run dev, then open /manual-preview.html
import { createRoot } from "react-dom/client";
import "@/index.css";
import { ManualCampaignPage } from "./ManualCampaignPage";
import { mockApi } from "./mockApi";

createRoot(document.getElementById("root")!).render(
  <ManualCampaignPage api={mockApi} onBack={() => {}} onAddMoney={() => alert("Add money")} onCreated={(id) => alert("Created campaign " + id)} />,
);
