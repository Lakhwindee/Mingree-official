import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreatorPickerModal } from "./CreatorPickerModal";
import { TIERS, compact, inr, tierRange } from "./tiers";
import type { Bill, CampaignDetails, City, CreatorCard, CreatorSearchParams, DeliverableType, ManualCampaignApi, SubmitResult } from "./types";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Wallet = __DummyIcon;
const Instagram = __DummyIcon;
const Upload = __DummyIcon;
const File = __DummyIcon;
const Check = __DummyIcon;



const DELIVERABLES: { id: DeliverableType; label: string }[] = [
  { id: "reel", label: "Reel" },
  { id: "story", label: "Story" },
  { id: "collab_post", label: "Collab post" },
];
const STYLES: { id: CampaignDetails["promotionStyle"]; label: string; text: string }[] = [
  { id: "lyrics", label: "Lyrics / Page promotion", text: "Creator uses the provided audio and content only" },
  { id: "face_on_camera", label: "Face on camera", text: "Creator appears in the video" },
  { id: "direct_share", label: "Direct share", text: "Creator shares the file you provide" },
];
const STEPS = ["Campaign Details", "Creator Selection", "Promotion Content", "Review & Launch"];
const DISCLOSURE = "Add #ad or the Instagram “Paid partnership” label.";

const emptyDetails: CampaignDetails = {
  title: "New Song / Brand Promo Campaign", 
  songUrl: "https://instagram.com/reels/sample", 
  description: "Promote brand audio / product on Instagram Reels across top creator channels.", 
  genre: "Music & Lifestyle", 
  language: "Hindi & English", 
  deliverable: "reel", 
  deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  cityIds: [1, 2, 3], 
  accountsToMention: [], 
  requiredTags: ["#MingreePromotions"], 
  captionNote: "Check out this brand new release! Use official audio.", 
  disclosureInstructions: "#ad | Paid Partnership", 
  assetUrl: "", 
  assetFileName: "", 
  websiteUrl: "", 
  promotionStyle: "lyrics",
};

function Field({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}{required && <span className="text-primary"> *</span>}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChipInput({ id, values, onChange, placeholder, prefix = "" }: { id: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; prefix?: string }) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim().replace(/^[@#]+/, "");
    if (t && !values.includes(prefix + t)) onChange([...values, prefix + t]);
    setV("");
  };
  return (
    <div>
      <Input id={id} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((x) => (
            <span key={x} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1 text-xs">
              {x}
              <button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(values.filter((y) => y !== x))}></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  api: ManualCampaignApi;
  onBack?: () => void;
  onAddMoney?: () => void;
  onCreated: (campaignId: number) => void;
}

export function ManualCampaignPage({ api, onBack, onAddMoney, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<CampaignDetails>(emptyDetails);
  const set = <K extends keyof CampaignDetails>(k: K, v: CampaignDetails[K]) => setD((p) => ({ ...p, [k]: v }));

  const [cities, setCities] = useState<City[]>([]);
  const [citiesErr, setCitiesErr] = useState<string | null>(null);
  const [cityQ, setCityQ] = useState("");
  useEffect(() => {
    api.listCities().then(setCities).catch((e) => setCitiesErr(e?.message || "Could not load cities"));
  }, [api]);

  const [selected, setSelected] = useState<Map<number, CreatorCard>>(new Map());
  const [pickerTier, setPickerTier] = useState<string | null>(null);
  const selectedCities = useMemo(() => cities.filter((c) => d.cityIds.includes(c.id)), [cities, d.cityIds]);

  // Changing cities or the deliverable changes who is eligible and what they cost, so the old picks are dropped.
  const resetSelection = () => { setSelected(new Map()); setBill(null); };
  const toggleCity = (id: number) => {
    set("cityIds", d.cityIds.includes(id) ? d.cityIds.filter((x) => x !== id) : [...d.cityIds, id]);
    if (selected.size) resetSelection();
  };
  const setDeliverable = (x: DeliverableType) => { set("deliverable", x); if (selected.size) resetSelection(); };

  const applyTier = (tierId: string, next: CreatorCard[]) =>
    setSelected((prev) => {
      const m = new Map([...prev].filter(([, c]) => c.tier !== tierId));
      next.forEach((c) => m.set(c.id, c));
      return m;
    });
  const remove = (id: number) => setSelected((p) => { const m = new Map(p); m.delete(id); return m; });

  // Bill always comes from the server.
  const [bill, setBill] = useState<Bill | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [billErr, setBillErr] = useState<string | null>(null);
  const creatorIds = useMemo(() => [...selected.keys()].sort((a, b) => a - b), [selected]);
  const refreshBill = useCallback(async () => {
    if (!creatorIds.length) { setBill(null); return; }
    setBillLoading(true); setBillErr(null);
    try { setBill(await api.previewBill({ deliverable: d.deliverable, creatorIds })); }
    catch (e: any) { setBillErr(e?.message || "Could not calculate the bill"); setBill(null); }
    finally { setBillLoading(false); }
  }, [api, creatorIds, d.deliverable]);
  useEffect(() => { const t = setTimeout(refreshBill, 250); return () => clearTimeout(t); }, [refreshBill]);

  // Live Google-style search & tier creator browser state
  const [globalSearchQ, setGlobalSearchQ] = useState("");
  const [activeTierFilter, setActiveTierFilter] = useState<string>("all");
  const [activeSort, setActiveSort] = useState<NonNullable<CreatorSearchParams["sort"]>>("relevance");
  const [searchResults, setSearchResults] = useState<CreatorCard[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 1) return;
    let active = true;
    setSearchLoading(true);
    setSearchErr(null);

    const timer = setTimeout(async () => {
      try {
        const res = await api.searchCreators({
          cityIds: d.cityIds,
          tierId: activeTierFilter === "all" ? "all" : activeTierFilter,
          deliverable: d.deliverable,
          q: globalSearchQ.trim() || undefined,
          sort: activeSort,
        });
        if (active) {
          setSearchResults(res.items || []);
        }
      } catch (e: any) {
        if (active) {
          setSearchErr(e?.message || "Could not load creators");
        }
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [step, globalSearchQ, activeTierFilter, activeSort, d.cityIds, d.deliverable, api]);

  const toggleCreator = (creator: CreatorCard) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(creator.id)) {
        next.delete(creator.id);
      } else {
        next.set(creator.id, creator);
      }
      return next;
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "warn" | "error"; text: string } | null>(null);
  const launch = async () => {
    if (!bill) return;
    setSubmitting(true); setNotice(null);
    try {
      const r = await api.submit({ details: d, creatorIds, billId: bill.billId });
      if (r.ok === true) return onCreated((r as { ok: true; campaignId: number }).campaignId);
      const f = r as Exclude<SubmitResult, { ok: true }>;
      if (f.reason === "bill_changed") { setBill(f.bill); setNotice({ kind: "warn", text: "A creator's rate changed. Check the new total below and press Launch again to confirm." }); }
      else if (f.reason === "insufficient_funds") { setBill(f.bill); setNotice({ kind: "error", text: "Your wallet balance is not enough for this total. Add money and try again." }); }
      else setNotice({ kind: "error", text: f.message });
    } catch (e: any) { setNotice({ kind: "error", text: e?.message || "Something went wrong. Nothing was charged." }); }
    finally { setSubmitting(false); }
  };

  const problems: string[][] = [
    [
      !d.title.trim() && "Add a campaign title",
      !d.songUrl.trim() && "Add the song link",
      !d.description.trim() && "Add a short description",
      !d.deadline && "Pick a deadline",
    ].filter(Boolean) as string[],
    [
      d.cityIds.length === 0 && "Choose at least one target city",
      creatorIds.length === 0 && "Select at least one creator",
    ].filter(Boolean) as string[],
    [!d.captionNote.trim() && "Add a caption note with the disclosure"].filter(Boolean) as string[],
    [!bill && "Waiting for the bill", bill && bill.shortfall > 0 && "Wallet balance is lower than the total"].filter(Boolean) as string[],
  ];
  const stepOk = problems[step].length === 0;
  const today = new Date().toISOString().slice(0, 10);

  const visibleCities = cities.filter((c) => c.name.toLowerCase().includes(cityQ.toLowerCase()) || c.state.toLowerCase().includes(cityQ.toLowerCase()));
  const perCreator = new Map(bill?.lines.map((l) => [l.creatorId, l]) ?? []);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6 [&_section]:min-w-0 overflow-x-hidden">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-3">
        {onBack && <Button variant="ghost" size="sm" onClick={onBack}> Back</Button>}
        <ol className="flex flex-1 min-w-0 items-center justify-center gap-2 sm:gap-4 overflow-x-auto" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep(i)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
              >
                <span className={cn("h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center border",
                  i < step ? "bg-primary text-primary-foreground border-primary" : i === step ? "border-primary text-primary bg-primary/10" : "text-muted-foreground")}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={cn("text-sm hidden md:inline font-medium", i === step ? "font-semibold text-primary" : "text-muted-foreground")}>{s}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="w-16 hidden sm:block" />
      </div>

      {/* Step 1 */}
      {step === 0 && (
        <section className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
          <header><h2 className="text-xl font-bold">Campaign Details</h2><p className="text-sm text-muted-foreground">Tell us about your song and where it should be promoted.</p></header>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="title" label="Campaign title" required><Input id="title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Summer single promo" /></Field>
            <Field id="song" label="Song link" required hint="Instagram audio, Reel or Spotify link"><Input id="song" value={d.songUrl} onChange={(e) => set("songUrl", e.target.value)} placeholder="https://" /></Field>
          </div>
          <Field id="desc" label="Description" required hint="What should creators do? Mention the vibe, hook and anything to avoid.">
            <Textarea id="desc" value={d.description} onChange={(e) => set("description", e.target.value)} rows={4} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field id="genre" label="Genre"><Input id="genre" value={d.genre} onChange={(e) => set("genre", e.target.value)} placeholder="Punjabi pop" /></Field>
            <Field id="lang" label="Language"><Input id="lang" value={d.language} onChange={(e) => set("language", e.target.value)} placeholder="Punjabi" /></Field>
            <Field id="deadline" label="Post by (deadline)" required><Input id="deadline" type="date" min={today} value={d.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
          </div>
          <Field id="accounts" label="Accounts to mention (optional)">
            <ChipInput id="accounts" values={d.accountsToMention} onChange={(v) => set("accountsToMention", v)} placeholder="@youraccount, press Enter" prefix="@" />
          </Field>

          <Field id="captionNote" label="Mandatory Caption Note" required hint="Caption copy that creators must include in their Reel">
            <Textarea id="captionNote" value={d.captionNote} onChange={(e) => set("captionNote", e.target.value)} rows={3} placeholder="#ad | Check out..." />
          </Field>
          <Field id="disclosure" label="FTC / Disclosure Instructions">
            <Input id="disclosure" value={d.disclosureInstructions || ""} onChange={(e) => set("disclosureInstructions", e.target.value)} placeholder="#ad | Paid Partnership" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="websiteUrl" label="Website / Landing Page Link (optional)" hint="Link for creators to promote in bio/caption">
              <Input id="websiteUrl" value={d.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://yourbrand.com" />
            </Field>
            <Field id="asset" label="Promotional Video / Asset File (optional)" hint="Upload video or banner for creators to download and post">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  id="manual-asset-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fd = new FormData();
                      fd.append("file", file);
                      try {
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        if (res.ok) {
                          const data = await res.json();
                          set("assetUrl", data.url);
                          set("assetFileName", data.fileName || file.name);
                          toast.success("File uploaded successfully!");
                        } else {
                          toast.error("Upload failed");
                        }
                      } catch {
                        toast.error("Upload failed");
                      }
                    }
                  }}
                />
                <label
                  htmlFor="manual-asset-upload"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-xs font-semibold cursor-pointer text-primary transition"
                >
                  
                  {d.assetFileName || (d.assetUrl ? "Change File" : "Upload Video / File")}
                </label>
                {d.assetUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-rose-500 hover:bg-rose-50 shrink-0"
                    onClick={() => { set("assetUrl", ""); set("assetFileName", ""); }}
                  >
                    
                  </Button>
                )}
              </div>
            </Field>
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-semibold">Content type <span className="text-primary">*</span></div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Content type">
              {DELIVERABLES.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={d.deliverable === x.id} onClick={() => setDeliverable(x.id)}
                  className={cn("h-10 px-4 rounded-xl border text-sm font-medium", d.deliverable === x.id ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50")}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Step 2 */}
      {step === 1 && (
        <section className="rounded-2xl border bg-card p-5 sm:p-7 space-y-6">
          <header className="text-center space-y-1.5 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Select Tiers &amp; Creators</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Search any creator directly by name or @handle, or pick a follower tier below. Verified creator rate cards are locked in.
            </p>
          </header>

          {/* Big Google-style Search Box in the Upper Center with Floating Auto-Suggest Dropdown */}
          <div className="w-full max-w-2xl mx-auto space-y-2 relative">
            <div className="relative flex items-center group">
              <span className="absolute left-5 text-muted-foreground text-xl pointer-events-none group-focus-within:text-primary transition-colors">
                🔍
              </span>
              <input
                id="global-creator-search"
                type="text"
                value={globalSearchQ}
                onChange={(e) => setGlobalSearchQ(e.target.value)}
                placeholder="Search creator by name or @handle... (e.g. judge, priya, maninder)"
                className="w-full h-14 pl-14 pr-12 rounded-full border-2 border-border/80 bg-background shadow-xs hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm sm:text-base transition-all outline-none"
              />
              {globalSearchQ && (
                <button
                  type="button"
                  onClick={() => setGlobalSearchQ("")}
                  className="absolute right-4 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 cursor-pointer transition"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Google-Style Floating Live Suggestion Dropdown */}
            {globalSearchQ.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card border rounded-2xl shadow-2xl overflow-hidden divide-y divide-border/40 max-h-[380px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 bg-muted/40 text-[11px] font-bold tracking-wider text-muted-foreground flex items-center justify-between uppercase">
                  <span>
                    Results in {selectedCities.map((c) => c.name).join(", ") || "Selected Cities"}
                  </span>
                  <span>{searchResults.length} match{searchResults.length === 1 ? "" : "es"}</span>
                </div>

                {searchLoading && (
                  <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                    Searching creators in {selectedCities.map((c) => c.name).join(", ") || "selected cities"}...
                  </div>
                )}

                {!searchLoading && searchResults.length === 0 && (
                  <div className="p-5 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">No creator found matching “{globalSearchQ}”</p>
                    <p className="text-[11px]">in {selectedCities.map((c) => c.name).join(", ") || "selected cities"}. Try adding more cities below.</p>
                  </div>
                )}

                {!searchLoading && searchResults.map((c) => {
                  const isChosen = selected.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition cursor-pointer"
                      onClick={() => toggleCreator(c)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.displayName} className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-border" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                            {c.displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-sm text-foreground truncate">@{c.username}</span>
                            {c.isRealRegisteredCreator && (
                              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0">
                                Registered
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 flex-wrap">
                            <span>{c.displayName}</span>
                            <span>·</span>
                            <span className="font-semibold text-foreground">{c.city?.name}</span>
                            <span>·</span>
                            <span className="text-sky-600 font-semibold">📡 {compact(c.reach || Math.round(c.followers * 2.2))} reach</span>
                            <span>·</span>
                            <span className="text-foreground font-medium">👁️ {c.medianViews ? compact(c.medianViews) : "—"} views</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums text-foreground">{inr(c.price)}</div>
                          <div className="text-[10px] text-muted-foreground">per {d.deliverable}</div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isChosen ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCreator(c);
                          }}
                          className={cn(
                            "h-8 px-3 text-xs font-semibold rounded-xl transition-all",
                            isChosen
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "border-primary text-primary hover:bg-primary/10"
                          )}
                        >
                          {isChosen ? "✓ Added" : "+ Add"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* City Selection directly inside Creator Selection */}
          <div className="space-y-2.5 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <span>📍 Target Cities</span>
                <span className="text-muted-foreground font-normal lowercase">({selectedCities.length} selected)</span>
              </span>
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => set("cityIds", cities.map((c) => c.id))}
                  className="text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => set("cityIds", [])}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Selected City Pills */}
            {selectedCities.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedCities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCity(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold hover:bg-primary/90 transition shadow-xs cursor-pointer"
                    title={`Click to remove ${c.name}`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] opacity-80">✕</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-destructive font-medium">Please select at least one city to see available creators.</p>
            )}

            {/* Unselected Cities Quick-Add Bar */}
            {cities.filter((c) => !d.cityIds.includes(c.id)).length > 0 && (
              <div className="pt-1 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Add city:</span>
                {cities.filter((c) => !d.cityIds.includes(c.id)).slice(0, 15).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCity(c.id)}
                    className="inline-flex items-center gap-1 rounded-full border bg-background hover:border-primary/60 px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground shrink-0 transition cursor-pointer"
                  >
                    <span>+ {c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tier Selector Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Follower Tiers</span>
              <div className="flex items-center gap-3">
                {activeTierFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setActiveTierFilter("all")}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    View All Tiers
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPickerTier(activeTierFilter === "all" ? "nano" : activeTierFilter)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Open Advanced Filters
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveTierFilter("all")}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                  activeTierFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                )}
              >
                All Tiers ({searchResults.length})
              </button>
              {TIERS.map((t) => {
                const countInSelected = [...selected.values()].filter((c) => c.tier === t.id).length;
                const isCurrent = activeTierFilter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTierFilter(isCurrent ? "all" : t.id)}
                    className={cn(
                      "px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5",
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-background hover:bg-muted/60 text-foreground border-border"
                    )}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] opacity-75">({tierRange(t)})</span>
                    {countInSelected > 0 && (
                      <span className={cn(
                        "h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                        isCurrent ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                      )}>
                        {countInSelected}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Creators Drawer / Live Results for Search or Tier */}
          <div className="space-y-3 rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span>
                  {globalSearchQ.trim()
                    ? `Matching Creators for “${globalSearchQ.trim()}”`
                    : activeTierFilter === "all"
                    ? "Creators (Ranked by High Reach & Views)"
                    : `${TIERS.find((t) => t.id === activeTierFilter)?.label} Tier Creators`}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({searchResults.length} {searchResults.length === 1 ? "creator" : "creators"})
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
                <select
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value as any)}
                  className="h-8 rounded-lg border bg-background px-2.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none"
                  aria-label="Sort creators"
                >
                  <option value="relevance">⭐ Top Reach &amp; Views (Default)</option>
                  <option value="reach_desc">📡 Highest Reach</option>
                  <option value="views_desc">👁️ Most Reel Views</option>
                  <option value="engagement_desc">🔥 High Engagement</option>
                  <option value="followers_desc">👥 Followers (High to Low)</option>
                  <option value="price_asc">💰 Price: Low to High</option>
                  <option value="price_desc">💰 Price: High to Low</option>
                </select>
                {searchLoading && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
              </div>
            </div>

            {searchErr && <p className="text-sm text-destructive">{searchErr}</p>}

            {!searchLoading && searchResults.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
                <p>No creators match “{globalSearchQ}”.</p>
                <Button variant="outline" size="sm" onClick={() => { setGlobalSearchQ(""); setActiveTierFilter("all"); }}>
                  Show All Creators
                </Button>
              </div>
            )}

            {/* Grid of Creators */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[490px] overflow-y-auto p-1">
              {searchResults.map((c) => {
                const isChosen = selected.has(c.id);
                const tierObj = TIERS.find((t) => t.id === c.tier);
                const reachVal = c.reach || Math.round(c.followers * 2.2);
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-xl border p-3.5 flex flex-col justify-between transition-all bg-card hover:shadow-sm",
                      isChosen ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.displayName} className="h-12 w-12 rounded-full object-cover shrink-0 ring-1 ring-border" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white font-bold flex items-center justify-center shrink-0">
                            {c.displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm truncate">@{c.username}</span>
                            {c.isRealRegisteredCreator && (
                              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0">
                                Registered
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{c.displayName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {tierObj?.label || c.tier}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.2 rounded-full">
                              ✓ Insta Insights
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">· {c.city?.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* 4 Performance & Insights Stats */}
                      <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/40 p-1.5 text-center text-xs">
                        <div className="bg-background/80 rounded py-1 px-0.5">
                          <div className="font-bold tabular-nums text-foreground text-xs">{compact(reachVal)}</div>
                          <div className="text-[9px] text-muted-foreground uppercase font-semibold">Reach</div>
                        </div>
                        <div className="bg-background/80 rounded py-1 px-0.5">
                          <div className="font-bold tabular-nums text-foreground text-xs">{c.medianViews != null ? compact(c.medianViews) : "—"}</div>
                          <div className="text-[9px] text-muted-foreground uppercase font-semibold">Views</div>
                        </div>
                        <div className="rounded py-1 px-0.5">
                          <div className="font-medium tabular-nums text-muted-foreground text-xs">{compact(c.followers)}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">Followers</div>
                        </div>
                        <div className="rounded py-1 px-0.5">
                          <div className="font-medium tabular-nums text-muted-foreground text-xs">{c.engagementRate != null ? `${c.engagementRate}%` : "—"}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">Eng.</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
                        <span>📍 {c.indiaAudiencePct || 95}% India Audience</span>
                        <span className="text-emerald-600 font-semibold">{c.onTimeRate || 98}% On-Time</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm tabular-nums text-foreground">{inr(c.price)}</div>
                        <div className="text-[10px] text-muted-foreground">per {d.deliverable === "collab_post" ? "collab" : d.deliverable}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isChosen ? "default" : "outline"}
                        onClick={() => toggleCreator(c)}
                        className={cn(
                          "h-8 px-3 text-xs font-semibold rounded-lg transition-all",
                          isChosen
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        )}
                      >
                        {isChosen ? "✓ Added" : "+ Add"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Creators Stack - Right below as requested */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Selected Creators</span>
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                  {selected.size}
                </span>
              </h3>
              {selected.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetSelection}
                  className="text-xs text-muted-foreground hover:text-destructive h-8"
                >
                  Clear all
                </Button>
              )}
            </div>

            {selected.size === 0 ? (
              <div className="text-center rounded-2xl border-2 border-dashed p-7 bg-muted/5 space-y-1">
                <p className="text-sm font-medium">No creators selected yet</p>
                <p className="text-xs text-muted-foreground">
                  Use the search bar above or click any tier to pick creators for your campaign.
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-xl border bg-card overflow-hidden">
                {[...selected.values()].map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3.5 hover:bg-muted/10 transition">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.displayName} className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                        {c.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                        <span>@{c.username}</span>
                        {c.isRealRegisteredCreator && (
                          <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 px-1 py-0.2 rounded shrink-0">
                            Registered
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.displayName} · {TIERS.find((t) => t.id === c.tier)?.label || c.tier} · {c.city?.name} · {compact(c.followers)} followers
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold tabular-nums">{inr(c.price)}</div>
                      <div className="text-[10px] text-muted-foreground">per {d.deliverable}</div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${c.username}`}
                      onClick={() => remove(c.id)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                      title="Remove creator"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bill summary right underneath selected creators */}
            <BillCard bill={bill} loading={billLoading} error={billErr} count={selected.size} />
          </div>
        </section>
      )}

      {/* Step 3 */}
      {step === 2 && (
        <section className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
          <header><h2 className="text-xl font-bold">Promotion Content</h2><p className="text-sm text-muted-foreground">Tell creators exactly what the post must contain. You will approve the post against these rules.</p></header>
          <div className="space-y-1.5">
            <div className="text-sm font-semibold">Promotion style</div>
            <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Promotion style">
              {STYLES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={d.promotionStyle === s.id} onClick={() => set("promotionStyle", s.id)}
                  className={cn("rounded-xl border p-3 text-left", d.promotionStyle === s.id ? "border-primary bg-primary/5" : "hover:border-primary/50")}>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.text}</div>
                </button>
              ))}
            </div>
          </div>
          <Field id="tags" label="Required hashtags / tags" hint="Creators must include these. Press Enter to add.">
            <ChipInput id="tags" values={d.requiredTags} onChange={(v) => set("requiredTags", v)} placeholder="#yoursong" prefix="#" />
          </Field>
          <Field id="note" label="Caption note" required hint="Always keep the paid-promotion disclosure.">
            <Textarea id="note" value={d.captionNote} onChange={(e) => set("captionNote", e.target.value)} rows={3} />
          </Field>
        </section>
      )}

      {/* Step 4 */}
      {step === 3 && (
        <section className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
          <header><h2 className="text-xl font-bold">Review &amp; Launch</h2><p className="text-sm text-muted-foreground">The total is taken from your wallet and held safely until each creator’s post is approved.</p></header>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between gap-3 min-w-0"><dt className="text-muted-foreground">Campaign</dt><dd className="font-medium text-right truncate min-w-0">{d.title}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Content type</dt><dd className="font-medium">{DELIVERABLES.find((x) => x.id === d.deliverable)?.label}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cities</dt><dd className="font-medium text-right">{selectedCities.map((c) => c.name).join(", ")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Post by</dt><dd className="font-medium">{d.deadline}</dd></div>
          </dl>
          {notice && (
            <div role="alert" className={cn("rounded-xl border p-3 text-sm flex gap-2", notice.kind === "warn" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-destructive/40 bg-destructive/5 text-destructive")}>
               <span>{notice.text}</span>
            </div>
          )}
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
                <th className="text-left p-3 font-medium">Creator</th><th className="text-right p-3 font-medium">Price</th><th className="text-right p-3 font-medium">Mingree fee</th><th className="text-right p-3 font-medium">You pay</th>
              </tr></thead>
              <tbody className="divide-y">
                {[...selected.values()].map((c) => {
                  const l = perCreator.get(c.id);
                  return (
                    <tr key={c.id}>
                      <td className="p-3">@{c.username}</td>
                      <td className="p-3 text-right tabular-nums">{inr(l?.price ?? c.price)}</td>
                      <td className="p-3 text-right tabular-nums">{l ? inr(l.feeArtist) : "—"}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{l ? inr(l.artistCost) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <BillCard bill={bill} loading={billLoading} error={billErr} count={selected.size} />
          {bill && bill.shortfall > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
              <span>You need {inr(bill.shortfall)} more in your wallet.</span>
              {onAddMoney && <Button size="sm" onClick={onAddMoney}> Add money</Button>}
            </div>
          )}
        </section>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}> Previous</Button>
        <div className="flex items-center gap-3">
          {!stepOk && <span className="text-xs text-muted-foreground hidden sm:inline">{problems[step][0]}</span>}
          {step < 3 ? (
            <Button disabled={!stepOk} onClick={() => setStep((s) => s + 1)}>Next </Button>
          ) : (
            <Button disabled={!stepOk || submitting || billLoading} onClick={launch}>
              {submitting ? "Launching..." : "Launch campaign"}{bill ? ` · ${inr(bill.total)}` : ""}
            </Button>
          )}
        </div>
      </div>

      {pickerTier && (
        <CreatorPickerModal
          open
          onOpenChange={(o) => !o && setPickerTier(null)}
          api={api}
          tierId={pickerTier}
          cities={selectedCities}
          deliverable={d.deliverable}
          selected={selected}
          onApply={applyTier}
        />
      )}
    </div>
  );
}

function BillCard({ bill, loading, error, count }: { bill: Bill | null; loading: boolean; error: string | null; count: number }) {
  if (count === 0) return null;
  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-1.5 text-sm" aria-live="polite">
      <div className="flex items-center justify-between"><h4 className="font-semibold">Your bill</h4>{loading && <span className="text-xs text-muted-foreground">Calculating...</span>}</div>
      {error && <p className="text-destructive">{error}</p>}
      {bill && (
        <>
          <Row l={`Creator prices (${bill.lines.length})`} v={inr(bill.subtotal)} />
          <Row l="Mingree fee (GST included)" v={inr(bill.feeTotal)} />
          <div className="border-t pt-2 mt-2 flex items-center justify-between text-base font-bold"><span>Total you pay</span><span className="tabular-nums text-primary">{inr(bill.total)}</span></div>
          <Row l="Wallet balance" v={inr(bill.walletBalance)} />
        </>
      )}
    </div>
  );
}
const Row = ({ l, v }: { l: string; v: string }) => (
  <div className="flex items-center justify-between text-muted-foreground"><span>{l}</span><span className="tabular-nums text-foreground">{v}</span></div>
);
