import type { ManualCampaignApi, CreatorSearchParams } from "./types";

// Real API client. Endpoints are defined in the Mingree v6 pack (Step 7 and Step 8).
async function j<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

export function createHttpApi(base = ""): ManualCampaignApi {
  const opts = { credentials: "include" as const };
  return {
    listCities: () => fetch(`${base}/api/cities`, opts).then((r) => j(r)),
    searchCreators: (p: CreatorSearchParams) => {
      const qs = new URLSearchParams();
      qs.set("cities", p.cityIds.join(","));
      qs.set("tier", p.tierId);
      qs.set("deliverable", p.deliverable);
      if (p.q) qs.set("q", p.q);
      if (p.minEngagement) qs.set("minEngagement", String(p.minEngagement));
      if (p.genres?.length) qs.set("genres", p.genres.join(","));
      if (p.sort) qs.set("sort", p.sort);
      if (p.cursor) qs.set("cursor", p.cursor);
      return fetch(`${base}/api/campaigns/creator-panel?${qs}`, opts).then((r) => j(r));
    },
    previewBill: (input) =>
      fetch(`${base}/api/campaigns/choose-creators/bill`, {
        ...opts, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      }).then((r) => j(r)),
    submit: async (p) => {
      const res = await fetch(`${base}/api/campaigns/choose-creators`, {
        ...opts, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
      });
      const body: any = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, campaignId: body.campaignId };
      if (res.status === 409) return { ok: false, reason: "bill_changed", bill: body.bill };
      if (res.status === 402) return { ok: false, reason: "insufficient_funds", bill: body.bill };
      return { ok: false, reason: "error", message: body?.error || "Something went wrong" };
    },
  };
}
