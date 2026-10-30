import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIERS, compact, inr, tierRange } from "./tiers";
import type { City, CreatorCard, CreatorSearchParams, DeliverableType, ManualCampaignApi } from "./types";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Instagram = __DummyIcon;
const Save = __DummyIcon;



const ENGAGEMENT = [0, 1, 3, 5];
const NICHES = ["Music", "Fashion", "Lifestyle", "Dance", "Fitness", "Comedy", "Travel", "Food", "Tech", "Gaming"];
const SORTS: { v: NonNullable<CreatorSearchParams["sort"]>; l: string }[] = [
  { v: "relevance", l: "⭐ Top Reach & Views" },
  { v: "reach_desc", l: "📡 Highest Reach" },
  { v: "views_desc", l: "👁️ Most Reel Views" },
  { v: "engagement_desc", l: "🔥 High Engagement" },
  { v: "followers_desc", l: "👥 Most followers" },
  { v: "price_asc", l: "💰 Price: low to high" },
  { v: "price_desc", l: "💰 Price: high to low" },
];

function Avatar({ c, size = 52 }: { c: Pick<CreatorCard, "avatarUrl" | "displayName">; size?: number }) {
  const initials = c.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return c.avatarUrl ? (
    <img src={c.avatarUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-semibold text-white bg-gradient-to-br from-pink-400 to-fuchsia-600"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center min-w-[64px]">
      <div className="font-semibold text-sm leading-tight tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Thumb({ url }: { url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-[68px] w-[52px] rounded-md object-cover bg-muted" loading="lazy" />
  ) : (
    <div className="h-[68px] w-[52px] rounded-md bg-gradient-to-b from-muted to-muted/40 border border-dashed flex items-center justify-center text-muted-foreground/50" aria-hidden></div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  api: ManualCampaignApi;
  tierId: string;
  cities: City[]; // only the cities the artist selected on the campaign
  deliverable: DeliverableType;
  selected: Map<number, CreatorCard>; // already chosen creators (all tiers)
  onApply: (tierId: string, next: CreatorCard[]) => void; // replaces the selection for this tier
}

export function CreatorPickerModal({ open, onOpenChange, api, tierId, cities, deliverable, selected, onApply }: Props) {
  const tier = TIERS.find((t) => t.id === tierId)!;
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [cityId, setCityId] = useState<number | "all">("all");
  const [minEng, setMinEng] = useState(0);
  const [niches, setNiches] = useState<string[]>([]);
  const [showAllNiches, setShowAllNiches] = useState(false);
  const [sort, setSort] = useState<NonNullable<CreatorSearchParams["sort"]>>("relevance");

  const [items, setItems] = useState<CreatorCard[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // Working selection inside the popup. Applied only when the artist clicks "Add N creators".
  const [draft, setDraft] = useState<Map<number, CreatorCard>>(new Map());
  useEffect(() => {
    if (open) {
      const m = new Map<number, CreatorCard>();
      selected.forEach((c, id) => c.tier === tierId && m.set(id, c));
      setDraft(m);
    }
  }, [open, tierId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo<CreatorSearchParams>(
    () => ({
      cityIds: cityId === "all" ? cities.map((c) => c.id) : [cityId],
      tierId,
      deliverable,
      q: debouncedQ || undefined,
      minEngagement: minEng || undefined,
      genres: niches.length ? niches : undefined,
      sort,
    }),
    [cityId, cities, tierId, deliverable, debouncedQ, minEng, niches, sort],
  );

  const load = async (append: boolean, cur: string | null) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const r = await api.searchCreators({ ...params, cursor: cur });
      if (id !== reqId.current) return; // a newer request replaced this one
      setItems((prev) => (append ? [...prev, ...r.items] : r.items));
      setTotal(r.total);
      setCursor(r.nextCursor);
    } catch (e: any) {
      if (id === reqId.current) setError(e?.message || "Could not load creators");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load(false, null);
  }, [open, params]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (c: CreatorCard) =>
    setDraft((prev) => {
      const m = new Map(prev);
      m.has(c.id) ? m.delete(c.id) : m.set(c.id, c);
      return m;
    });

  const draftList = [...draft.values()];
  const clearAll = () => {
    setQ(""); setCityId("all"); setMinEng(0); setNiches([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden sm:rounded-2xl">
        <div className="px-6 pt-5 pb-4 border-b space-y-4 bg-background">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                Select Creators – {tier.label} Tier ({tierRange(tier)})
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Creators from your selected cities with verified rate cards. Search any creator below.
              </DialogDescription>
            </div>
            <button type="button" onClick={clearAll} className="text-xs text-primary hover:underline font-medium self-start sm:self-center">
              Clear All Filters
            </button>
          </div>

          {/* Big Google-style Search Box in the Upper Center */}
          <div className="w-full max-w-2xl mx-auto">
            <div className="relative flex items-center group">
              <span className="absolute left-4.5 text-muted-foreground text-lg pointer-events-none">🔍</span>
              <input
                id="creator-modal-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search creator by name or @handle... (e.g. judge, priya, maninder)"
                className="w-full h-12 pl-12 pr-12 rounded-full border-2 border-border/80 bg-background shadow-xs hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm sm:text-base transition-all outline-none"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-3.5 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Filters */}
          <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r p-4 md:overflow-y-auto space-y-5 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Refine Filters</h3>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="creator-city" className="text-xs font-semibold">City</label>
              <select
                id="creator-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full h-9 rounded-lg border bg-background px-2 text-sm"
              >
                <option value="all">All selected cities</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold">Engagement rate</div>
              <div className="flex flex-wrap gap-1.5">
                {ENGAGEMENT.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMinEng(v)}
                    className={cn(
                      "h-8 px-3 rounded-lg border text-xs font-medium",
                      minEng === v ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:border-primary/50",
                    )}
                  >
                    {v === 0 ? "Any" : `${v}%+`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold">Content niche</div>
              <div className="space-y-1.5">
                {(showAllNiches ? NICHES : NICHES.slice(0, 6)).map((n) => (
                  <label key={n} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={niches.includes(n)}
                      onChange={() => setNiches((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))}
                      className="h-4 w-4 accent-[hsl(326_100%_60%)]"
                    />
                    {n}
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setShowAllNiches((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground">
                {showAllNiches ? "Fewer −" : "More +"}
              </button>
            </div>
          </aside>

          {/* List */}
          <section className="flex-1 min-w-0 flex flex-col">
            <div className="px-5 py-3 flex items-center justify-between gap-3 border-b">
              <h3 className="font-semibold">Creators <span className="text-muted-foreground font-normal">({total.toLocaleString("en-IN")})</span></h3>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground hidden sm:inline">Sort by:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-9 rounded-lg border bg-background px-2 text-sm" aria-label="Sort creators">
                  {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </label>
            </div>

            <div className="flex-1 overflow-y-auto divide-y" role="list">
              {error && (
                <div className="p-6 text-sm text-destructive">
                  {error}{" "}
                  <button className="underline" onClick={() => load(false, null)}>Try again</button>
                </div>
              )}
              {!error && !loading && items.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No creators match these cities and filters yet. Try another tier or clear filters.
                </div>
              )}
              {items.map((c) => {
                const on = draft.has(c.id);
                const verified = c.metricsSource === "api_verified";
                return (
                  <div key={c.id} role="listitem" className={cn("px-5 py-3 flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-3", on && "bg-primary/[0.04]")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(c)}
                      aria-label={`Select ${c.username}`}
                      className="h-5 w-5 shrink-0 accent-[hsl(326_100%_60%)]"
                    />
                    <Avatar c={c} />
                    <div className="min-w-0 flex-1 basis-40">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-sm truncate">@{c.username}</span>
                        {c.igVerifiedBadge && (
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-sky-500 text-white text-[9px] shrink-0">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        <span>Instagram Creator</span>
                        {c.city?.name ? ` · ${c.city.name}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-1 items-start">
                      <Stat value={compact(c.reach || Math.round(c.followers * 2.2))} label="30D Reach" />
                      <Stat value={c.medianViews != null ? compact(c.medianViews) : "—"} label="Avg Views" />
                      <Stat value={compact(c.followers)} label="Followers" />
                      <Stat value={c.engagementRate != null ? `${c.engagementRate.toFixed(1)}%` : "—"} label="Eng. Rate" />
                    </div>
                    <div className="hidden xl:flex gap-1.5" aria-label="Recent reels">
                      {[0, 1, 2].map((i) => <Thumb key={i} url={c.recentReels[i]?.thumbUrl} />)}
                    </div>
                    <div className="min-w-[88px] text-right shrink-0">
                      <div className="font-bold text-base tabular-nums">{inr(c.price)}</div>
                      <div className="text-[11px] text-muted-foreground">per {deliverable === "collab_post" ? "post" : deliverable}</div>
                      <div
                        className={cn("mt-1 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium", verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}
                        title={verified ? "Numbers come from Instagram" : "Numbers are reported by the creator and not verified yet"}
                      >
                        {verified ? "Verified" : c.metricsSource === "creator_reported" ? "Unverified" : "No data"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => toggle(c)}
                      className={cn("w-[96px] shrink-0", !on && "border-primary text-primary hover:bg-primary/5")}
                    >
                      {on ? <> Added</> : <> Add</>}
                    </Button>
                  </div>
                );
              })}
              {loading && (
                <div className="p-6 flex justify-center text-muted-foreground"></div>
              )}
              {!loading && cursor && (
                <div className="p-4 text-center">
                  <Button variant="outline" size="sm" onClick={() => load(true, cursor)}>Load more creators</Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="border-t px-5 py-3 flex items-center justify-between gap-3 bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex -space-x-2">
              {draftList.slice(0, 4).map((c) => (
                <div key={c.id} className="ring-2 ring-background rounded-full"><Avatar c={c} size={30} /></div>
              ))}
            </div>
            <div className="text-sm font-semibold truncate">
              {draftList.length} creator{draftList.length === 1 ? "" : "s"} selected
              {draftList.length > 0 && (
                <span className="ml-2 font-normal text-muted-foreground">· {inr(draftList.reduce((s, c) => s + c.price, 0))} before fees</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { onApply(tierId, draftList); onOpenChange(false); }}>
              {draftList.length === 0 && selected.size > 0 ? "Save" : `Add ${draftList.length} Creator${draftList.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
