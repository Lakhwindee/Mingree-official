import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreatorPickerModal } from "./CreatorPickerModal";
import { TIERS, compact, inr, tierRange } from "./tiers";
import type { Bill, CampaignDetails, City, CreatorCard, DeliverableType, ManualCampaignApi, SubmitResult } from "./types";

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
  title: "", songUrl: "", description: "", genre: "", language: "", deliverable: "reel", deadline: "",
  cityIds: [], accountsToMention: [], requiredTags: ["#Mingree"], captionNote: "Check out this brand new release! Use official audio.", disclosureInstructions: "#ad | Paid Partnership", assetUrl: "", assetFileName: "", websiteUrl: "", promotionStyle: "lyrics",
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
      d.cityIds.length === 0 && "Choose at least one city",
    ].filter(Boolean) as string[],
    [creatorIds.length === 0 && "Select at least one creator"].filter(Boolean) as string[],
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
              <span className={cn("h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center border",
                i < step ? "bg-primary text-primary-foreground border-primary" : i === step ? "border-primary text-primary bg-primary/10" : "text-muted-foreground")}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={cn("text-sm hidden md:inline", i === step ? "font-semibold text-primary" : "text-muted-foreground")}>{s}</span>
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
          <div className="space-y-2">
            <div className="text-sm font-semibold">Cities <span className="text-primary">*</span></div>
            <p className="text-xs text-muted-foreground">Only creators who live in these cities will be shown. You can pick more than one.</p>
            {citiesErr && <p className="text-sm text-destructive">{citiesErr}</p>}
            <Input id="cityq" value={cityQ} onChange={(e) => setCityQ(e.target.value)} placeholder="Search city or state" aria-label="Search cities" />
            {selectedCities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCities.map((c) => (
                  <button key={c.id} type="button" onClick={() => toggleCity(c.id)} className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs">
                     {c.name} 
                  </button>
                ))}
              </div>
            )}
            <div className="max-h-44 overflow-y-auto rounded-xl border p-2 flex flex-wrap gap-2">
              {visibleCities.filter((c) => !d.cityIds.includes(c.id)).slice(0, 80).map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCity(c.id)} className="rounded-full border px-3 py-1 text-xs hover:border-primary hover:text-primary">
                  {c.name}<span className="text-muted-foreground">, {c.state}</span>
                </button>
              ))}
              {cities.length > 0 && visibleCities.length === 0 && <span className="text-xs text-muted-foreground p-2">No city matches “{cityQ}”.</span>}
            </div>
          </div>
        </section>
      )}

      {/* Step 2 */}
      {step === 1 && (
        <section className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
          <header>
            <h2 className="text-xl font-bold">Select Tiers &amp; Creators</h2>
            <p className="text-sm text-muted-foreground">
              Pick a tier to see creators from {selectedCities.map((c) => c.name).join(", ") || "your cities"}. A creator’s tier is set by their Instagram followers.
            </p>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TIERS.map((t) => {
              const n = [...selected.values()].filter((c) => c.tier === t.id).length;
              return (
                <button key={t.id} type="button" onClick={() => setPickerTier(t.id)}
                  className={cn("rounded-xl border p-3 text-left transition hover:border-primary/60", n > 0 && "border-primary bg-primary/5")}>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{tierRange(t)} followers</div>
                  <div className={cn("mt-2 text-xs font-medium", n > 0 ? "text-primary" : "text-muted-foreground")}>
                    {n > 0 ? `${n} selected` : "Choose creators"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2"> Your selection ({selected.size})</h3>
            {selected.size === 0 && <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">No creators yet. Open a tier above and tick the creators you want.</p>}
            <div className="divide-y rounded-xl border">
              {[...selected.values()].map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">@{c.username} <span className="text-xs font-normal text-muted-foreground">· {TIERS.find((t) => t.id === c.tier)?.label} · {c.city.name} · {compact(c.followers)}</span></div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{inr(c.price)}</div>
                  <button type="button" aria-label={`Remove ${c.username}`} onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"></button>
                </div>
              ))}
            </div>
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
