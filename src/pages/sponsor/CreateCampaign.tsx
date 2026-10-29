import { SponsorSidebar } from "@/components/SponsorSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { api, formatINR } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { TIERS, FIXED_TIERS, getPaymentByStyle, calculateSponsorPayment, TAX_RATES, formatTierRange } from "@shared/tiers";
import { PROMOTION_CATEGORIES } from "@shared/schema";
import { COUNTRIES, getCountryByCode } from "@shared/countries";
import { getCitiesByCountry, CITIES_BY_COUNTRY } from "@shared/cities";
import { CreatorListPopup } from "@/components/CreatorListPopup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Dummy icon fallbacks for removed icons
const __DummyIcon = (_props?: any) => null;
const Wallet = __DummyIcon;
const FileCheck = __DummyIcon;
const Instagram = __DummyIcon;
const AtSign = __DummyIcon;
const Camera = __DummyIcon;
const Upload = __DummyIcon;
const Tag = __DummyIcon;
const File = __DummyIcon;

const CONTENT_TYPES = [
  { id: "reel", label: "Reel", icon: "🎬" },
  { id: "story", label: "Story", icon: "📱" },
  { id: "post", label: "Post", icon: "📷" },
  { id: "carousel", label: "Carousel", icon: "🎠" },
];

const PROMOTION_STYLES = [
  { 
    id: "lyricals", 
    label: "Lyricals / Page Promotion", 
    icon: "🎵",
    description: "Creator uses provided content/audio only"
  },
  { 
    id: "face_ad", 
    label: "Face on Camera", 
    icon: "🎥",
    description: "Creator appears in video for the ad"
  },
  { 
    id: "share_only", 
    label: "Direct Share", 
    icon: "📤",
    description: "Creator shares sponsor's provided file"
  },
];

interface TierSelection {
  tierName: string;
  tierId: number;
  creatorsNeeded: number;
  paymentPerCreator: number;
  minFollowers: number;
  maxFollowers: number;
}

export default function CreateCampaign() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: sponsor } = useQuery({
    queryKey: ["currentSponsor"],
    queryFn: api.getCurrentSponsor,
  });

  const { data: wallet } = useQuery({
    queryKey: ["sponsorWallet", sponsor?.id],
    queryFn: () => sponsor ? api.getSponsorWallet(sponsor.id) : null,
    enabled: !!sponsor,
  });

  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    brandLogo: "",
    brandLogoFileName: "",
    category: "music_reels",
    contentType: "reel",
    promotionStyle: "",
    description: "",
    requiredCaptionNote: "",
    requiredTags: [""] as string[],
    disclosureInstructions: "#ad | Paid Partnership",
    deadline: "",
    assetUrl: "",
    assetFileName: "",
    targetCities: [] as string[],
    mentions: [""] as string[],
  });

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedCreators, setSelectedCreators] = useState<any[]>([]);
  const [selectedTierName, setSelectedTierName] = useState("");

  const [cityError, setCityError] = useState(false);

  const toggleTier = (tier: typeof TIERS[0]) => {
    const exists = tierSelections.find(t => t.tierName === tier.name);
    if (exists) {
      setTierSelections(prev => prev.filter(t => t.tierName !== tier.name));
    } else {
      const payment = formData.promotionStyle 
        ? getPaymentByStyle(tier.basePayment, formData.promotionStyle)
        : tier.basePayment;
      setTierSelections(prev => [...prev, {
        tierName: tier.name,
        tierId: tier.id,
        creatorsNeeded: 1,
        paymentPerCreator: payment,
        minFollowers: tier.minFollowers,
        maxFollowers: tier.maxFollowers,
      }]);
    }
  };

  const [tierSelections, setTierSelections] = useState<TierSelection[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    });
    
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          setFormData(prev => ({
            ...prev,
            assetUrl: data.url,
            assetFileName: data.fileName,
          }));
          toast.success("File uploaded successfully!");
        } catch {
          toast.error("Failed to parse upload response");
        }
      } else {
        toast.error("Upload failed");
      }
      setIsUploading(false);
      setUploadProgress(0);
    });
    
    xhr.addEventListener("error", () => {
      toast.error("Failed to upload file");
      setIsUploading(false);
      setUploadProgress(0);
    });
    
    xhr.open("POST", "/api/upload");
    xhr.send(formDataUpload);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const removeFile = () => {
    setFormData(prev => ({ ...prev, assetUrl: "", assetFileName: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    setIsUploadingLogo(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          brandLogo: data.url,
          brandLogoFileName: data.fileName,
        }));
        toast.success("Brand logo uploaded!");
      } else {
        toast.error("Failed to upload logo");
      }
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, brandLogo: "", brandLogoFileName: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };


  const updateTierCreators = (tierName: string, count: number) => {
    setTierSelections(prev => prev.map(t => 
      t.tierName === tierName ? { ...t, creatorsNeeded: Math.max(1, count) } : t
    ));
  };

  const updateTierPayment = (tierName: string, payment: number) => {
    setTierSelections(prev => prev.map(t => 
      t.tierName === tierName ? { ...t, paymentPerCreator: Math.max(0, payment) } : t
    ));
  };

  const removeTierSelection = (tierName: string) => {
    setTierSelections(prev => prev.filter(t => t.tierName !== tierName));
  };

  const updatePaymentsForStyle = (style: string) => {
    setTierSelections(prev => prev.map(t => {
      const tier = TIERS.find(tier => tier.name === t.tierName);
      if (!tier) return t;
      return {
        ...t,
        paymentPerCreator: getPaymentByStyle(tier.basePayment, style),
      };
    }));
  };

  const getCreatorPaymentTotal = () => {
    return tierSelections.reduce((sum, t) => sum + (t.paymentPerCreator * t.creatorsNeeded), 0);
  };

  const getTotalCreators = () => {
    return tierSelections.reduce((sum, t) => sum + t.creatorsNeeded, 0);
  };

  const walletBalance = parseFloat(wallet?.balance || sponsor?.balance || "0");
  const creatorPaymentTotal = getCreatorPaymentTotal();
  const paymentBreakdown = calculateSponsorPayment(creatorPaymentTotal);
  const totalPayable = paymentBreakdown.totalPayable;
  const hasInsufficientBalance = totalPayable > walletBalance;

  const validateForm = () => {
    if (!formData.title || !formData.brand || !formData.deadline) {
      toast.error("Please fill all required fields");
      return false;
    }
    if (formData.targetCities.length === 0) {
      toast.error("Please select at least one city");
      return false;
    }
    if (!formData.contentType) {
      toast.error("Please select a content type");
      return false;
    }
    if (!formData.promotionStyle) {
      toast.error("Please select a promotion style");
      return false;
    }
    if (tierSelections.length === 0) {
      toast.error("Please add at least one tier with creators");
      return false;
    }
    return true;
  };

  const handleReviewClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmCreate = async () => {
    if (!sponsor) {
      toast.error("Sponsor not found");
      return;
    }

    if (hasInsufficientBalance) {
      toast.error("Insufficient wallet balance. Please add funds first.");
      setShowConfirmDialog(false);
      navigate("/sponsor/wallet");
      return;
    }

    setIsCreating(true);
    const typeLabel = CONTENT_TYPES.find(ct => ct.id === formData.contentType)?.label || "Reel";

    try {
        await api.createCampaign(sponsor.id, {
          title: formData.title,
          brand: formData.brand,
          brandLogo: formData.brandLogo,
          category: formData.category,
          payAmount: "0", // Will be handled per tier
          type: typeLabel,
          contentTypes: [formData.contentType],
          promotionStyle: formData.promotionStyle || undefined,
          assetUrl: formData.assetUrl || null,
          assetFileName: formData.assetFileName || null,
          description: formData.description,
          requiredCaptionNote: formData.requiredCaptionNote,
          requiredTags: formData.requiredTags.filter(t => t.trim() !== ''),
          disclosureInstructions: formData.disclosureInstructions,
          deadline: formData.deadline,
          targetCities: formData.targetCities,
          targetCountries: [],
          mentions: formData.mentions.filter(m => m.trim() !== ''),
          minFollowers: Math.min(...tierSelections.map(t => t.minFollowers)),
          totalSpots: getTotalCreators(),
          tier: JSON.stringify(tierSelections.map(t => ({
            name: t.tierName,
            creatorsNeeded: t.creatorsNeeded,
            paymentPerCreator: t.paymentPerCreator,
            minFollowers: t.minFollowers
          })))
        });
      
      queryClient.invalidateQueries({ queryKey: ["sponsorCampaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sponsorWallet"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campaign created successfully!`);
      setShowConfirmDialog(false);
      navigate("/sponsor/campaigns");
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  const getPromotionStyleLabel = () => {
    return PROMOTION_STYLES.find(s => s.id === formData.promotionStyle)?.label || "";
  };

  const getCategoryLabel = () => {
    return PROMOTION_CATEGORIES.find(c => c.id === formData.category)?.name || "";
  };

  const campaignMode = 'fixed';

  return (
    <div className="flex min-h-screen bg-background">
      <SponsorSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="mx-auto max-w-3xl p-6">
          <div className="mb-8 flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/sponsor/create-campaign")}>&larr; Back</Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create Fixed Price Campaign</h1>
              <p className="text-muted-foreground">List a new fixed price influencer marketing campaign</p>
            </div>
          </div>

          <form onSubmit={handleReviewClick}>
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Campaign Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Summer Fashion Reel"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      data-testid="input-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand Name *</Label>
                    <Input
                      id="brand"
                      placeholder="e.g., Myntra"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      data-testid="input-brand"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Brand Logo (Optional)</Label>
                  <div className="flex items-center gap-4">
                    {formData.brandLogo ? (
                      <div className="relative">
                        <img 
                          src={formData.brandLogo} 
                          alt="Brand logo" 
                          className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                          data-testid="button-remove-logo"
                        >
                          
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                        {formData.brand ? formData.brand.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        ref={logoInputRef}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        data-testid="button-upload-logo"
                      >
                        {isUploadingLogo ? (
                          <> Uploading...</>
                        ) : (
                          <> Upload Logo</>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload your brand logo.
                      </p>
                    </div>
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="targetCities">Target Cities *</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.targetCities.map((city) => (
                      <Badge key={city} variant="secondary" className="flex items-center gap-1">
                        {city.includes(':') ? city.split(':')[1] : city}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            targetCities: prev.targetCities.filter(c => c !== city) 
                          }))}
                          className="ml-1 text-xs hover:text-red-400"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Select onValueChange={(val) => {
                    const cleanCity = val.includes(':') ? val.split(':')[1] : val;
                    if (!formData.targetCities.includes(cleanCity)) {
                      setFormData(prev => ({ ...prev, targetCities: [...prev.targetCities, cleanCity] }));
                    }
                  }}>
                    <SelectTrigger className={cityError ? "border-red-500" : ""}>
                      <SelectValue placeholder="Search and select cities..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(CITIES_BY_COUNTRY).flatMap(([country, cities]) => 
                        cities.map(city => ({ country, city }))
                      ).sort((a, b) => a.city.localeCompare(b.city)).map(({ country, city }) => (
                        <SelectItem key={`${country}-${city}`} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Please select at least one city to target.
                  </p>
                </div>

                <div className="space-y-3 pt-6 border-t">
                  <Label className="text-lg">Select Tiers & Number of Creators *</Label>
                  <p className="text-sm text-muted-foreground">Click on tiers to add them, then specify how many creators you need for each</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {(campaignMode === 'fixed' ? FIXED_TIERS : TIERS).map((tier) => {
                        const isSelected = tierSelections.some(t => t.tierName === tier.name);
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => toggleTier(tier)}
                            disabled={isCreating}
                            className={`flex flex-col items-center justify-center rounded-lg border-2 p-2 text-center transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-muted hover:border-muted-foreground/50"
                            } ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
                            data-testid={`tier-${tier.id}`}
                          >
                            <div className="font-semibold text-sm">{tier.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatTierRange(tier.minFollowers, tier.maxFollowers)}
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {tierSelections.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <Label className="text-sm">Selected Tiers - Set Creators Count</Label>
                      <div className="space-y-2">
                        {tierSelections
                          .sort((a, b) => a.tierId - b.tierId)
                          .map((selection, index) => (
                          <div 
                            key={`${selection.tierName}-${index}`}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                            data-testid={`tier-selection-${selection.tierId}`}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{selection.tierName}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTierRange(selection.minFollowers, selection.maxFollowers)} followers | {formatINR(selection.paymentPerCreator)}/creator
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">₹</span>
                                <Input
                                  type="number"
                                  min="0"
                                  className="w-24"
                                  value={selection.paymentPerCreator}
                                  onChange={(e) => updateTierPayment(selection.tierName, parseInt(e.target.value) || 0)}
                                  placeholder="Pay/creator"
                                  data-testid={`input-payment-${selection.tierId}`}
                                />
                              </div>
                              <Input
                                type="number"
                                min="1"
                                className="w-20"
                                value={selection.creatorsNeeded}
                                onChange={(e) => updateTierCreators(selection.tierName, parseInt(e.target.value) || 1)}
                                data-testid={`input-creators-${selection.tierId}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTierSelection(selection.tierName)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>


                <div className="space-y-2">
                  <Label htmlFor="description">Campaign Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what creators need to do..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-description"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <AtSign className="h-4 w-4 text-primary" />
                      Accounts to Mention (Optional)
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, mentions: [...formData.mentions, ""] })}
                      data-testid="button-add-mention"
                    >
                       Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add Instagram handles that creators should mention/tag in their posts
                  </p>
                  <div className="space-y-2">
                    {formData.mentions.map((mention, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                          <Input
                            placeholder="username"
                            className="pl-8"
                            value={mention}
                            onChange={(e) => {
                              const newMentions = [...formData.mentions];
                              newMentions[index] = e.target.value.replace(/^@/, '');
                              setFormData({ ...formData, mentions: newMentions });
                            }}
                            data-testid={`input-mention-${index}`}
                          />
                        </div>
                        {formData.mentions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const newMentions = formData.mentions.filter((_, i) => i !== index);
                              setFormData({ ...formData, mentions: newMentions });
                            }}
                            data-testid={`button-remove-mention-${index}`}
                          >
                            
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required Caption Note */}
                <div className="space-y-2">
                  <Label htmlFor="requiredCaptionNote">Required Caption Note (What creators must include in caption)</Label>
                  <Textarea
                    id="requiredCaptionNote"
                    placeholder="e.g., Vibing to our new track! Stream now on Spotify. #ad"
                    rows={3}
                    value={formData.requiredCaptionNote}
                    onChange={(e) => setFormData({ ...formData, requiredCaptionNote: e.target.value })}
                    data-testid="input-required-caption"
                  />
                  <p className="text-xs text-muted-foreground">This exact text will be provided to creators to copy and paste.</p>
                </div>

                {/* Required Hashtags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      
                      Required Hashtags
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, requiredTags: [...formData.requiredTags, ""] })}
                    >
                       Add Tag
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.requiredTags.map((tag, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="#hashtag"
                          value={tag}
                          onChange={(e) => {
                            const newTags = [...formData.requiredTags];
                            newTags[index] = e.target.value;
                            setFormData({ ...formData, requiredTags: newTags });
                          }}
                        />
                        {formData.requiredTags.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              const newTags = formData.requiredTags.filter((_, i) => i !== index);
                              setFormData({ ...formData, requiredTags: newTags });
                            }}
                          >
                            
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclosure Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="disclosureInstructions">Mandatory FTC / Platform Disclosure</Label>
                  <Input
                    id="disclosureInstructions"
                    placeholder="#ad | Paid Partnership"
                    value={formData.disclosureInstructions}
                    onChange={(e) => setFormData({ ...formData, disclosureInstructions: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Promotion Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {PROMOTION_CATEGORIES.find(c => c.id === formData.category)?.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Content Type *</Label>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {CONTENT_TYPES.map((type) => {
                      const isSelected = formData.contentType === type.id;
                      return (
                        <label
                          key={type.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          }`}
                          data-testid={`radio-content-${type.id}`}
                        >
                          <input
                            type="radio"
                            name="contentType"
                            value={type.id}
                            checked={isSelected}
                            onChange={() => setFormData({ ...formData, contentType: type.id })}
                            className="h-4 w-4 accent-primary"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{type.icon}</span>
                            <span className="text-sm font-medium">{type.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Promotion Style *</Label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {PROMOTION_STYLES.map((style) => {
                      const isSelected = formData.promotionStyle === style.id;
                      return (
                        <label
                          key={style.id}
                          className={`flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          }`}
                          data-testid={`promo-${style.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="promotionStyle"
                              value={style.id}
                              checked={isSelected}
                              onChange={() => {
                                setFormData({ ...formData, promotionStyle: style.id });
                                updatePaymentsForStyle(style.id);
                              }}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="text-xl">{style.icon}</span>
                            <span className="font-medium">{style.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">{style.description}</p>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    data-testid="input-deadline"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Upload Content for Creators (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload audio, video, images, or any file that creators need for this campaign
                  </p>
                  
                  {!formData.assetUrl ? (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="upload-dropzone"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="audio/*,video/*,image/*,.pdf,.zip,.mp3,.mp4,.mov,.wav"
                        data-testid="input-file"
                      />
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3 w-full px-6">
                          
                          <div className="w-full max-w-xs">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Uploading...</span>
                              <span className="font-medium text-primary">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="rounded-full bg-primary/10 p-4">
                            
                          </div>
                          <div>
                            <p className="font-medium">Click to upload file</p>
                            <p className="text-sm text-muted-foreground">Audio, Video, Images, PDF (Max 50MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-900/20 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-100 dark:bg-green-800 p-2">
                          <FileCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-300">{formData.assetFileName}</p>
                          <p className="text-xs text-green-600">File uploaded successfully</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid="button-remove-file"
                      >
                        
                      </Button>
                    </div>
                  )}
                </div>


                {tierSelections.length > 0 && (
                  <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6">
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-4">Payment Summary</h3>
                    <div className="space-y-3">
                      {tierSelections
                        .sort((a, b) => a.tierId - b.tierId)
                        .map((selection) => (
                        <div key={selection.tierName} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {selection.tierName} ({selection.creatorsNeeded} creators)
                          </span>
                          <span className="font-medium">
                            {formatINR(selection.paymentPerCreator * selection.creatorsNeeded)}
                          </span>
                        </div>
                      ))}
                      
                      <div className="border-t pt-3 mt-3 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Creator Payments Subtotal</span>
                          <span className="font-medium">{formatINR(paymentBreakdown.creatorPayment)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Platform Fee ({TAX_RATES.PLATFORM_FEE_PERCENT}%)</span>
                          <span className="font-medium">{formatINR(paymentBreakdown.platformFee)}</span>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Total Payable ({getTotalCreators()} creators)
                          </span>
                          <span className="text-2xl font-bold text-green-600" data-testid="total-payment">
                            {formatINR(totalPayable)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed">
                          <span className="text-sm flex items-center gap-2">
                            
                            Wallet Balance
                          </span>
                          <span className={`font-semibold ${hasInsufficientBalance ? "text-red-500" : "text-green-600"}`}>
                            {formatINR(walletBalance)}
                          </span>
                        </div>
                        {hasInsufficientBalance && (
                          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              
                              <span className="text-sm font-medium">
                                Insufficient balance! Need {formatINR(totalPayable - walletBalance)} more
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 rounded-full"
                    disabled={tierSelections.length === 0}
                    data-testid="button-submit"
                  >
                    Review & Create Campaign
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => navigate("/sponsor/campaigns")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Campaign Creation</DialogTitle>
            <DialogDescription>
              Please review all details before creating your campaign
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                
                Campaign Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-medium">{formData.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Brand:</span>
                  <p className="font-medium">{formData.brand}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{getCategoryLabel()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Promotion Style:</span>
                  <p className="font-medium">{getPromotionStyleLabel()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Content Type:</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {CONTENT_TYPES.find(ct => ct.id === formData.contentType)?.label || "Reel"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                     Deadline:
                  </span>
                  <p className="font-medium">{new Date(formData.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                
                Tier & Creator Selection
              </h4>
              <div className="space-y-2">
                {tierSelections.sort((a, b) => a.tierId - b.tierId).map(selection => (
                  <div key={selection.tierName} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                    <div>
                      <span className="font-medium">{selection.tierName}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        ({selection.minFollowers >= 1000000 
                          ? `${(selection.minFollowers / 1000000).toFixed(1)}M` 
                          : `${(selection.minFollowers / 1000)}K`}+ followers)
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{selection.creatorsNeeded} creators</div>
                      <div className="text-sm text-muted-foreground">
                        {formatINR(selection.paymentPerCreator)} each = {formatINR(selection.paymentPerCreator * selection.creatorsNeeded)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                
                Payment Breakdown
              </h4>
              <div className={`p-4 rounded-lg ${hasInsufficientBalance ? "bg-red-50 dark:bg-red-900/20 border border-red-200" : "bg-green-50 dark:bg-green-900/20 border border-green-200"}`}>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Creator Payments</span>
                    <span className="font-medium">{formatINR(paymentBreakdown.creatorPayment)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Platform Fee ({TAX_RATES.PLATFORM_FEE_PERCENT}%)</span>
                    <span className="font-medium">{formatINR(paymentBreakdown.platformFee)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-medium">Total Payable</span>
                  <span className="text-2xl font-bold">{formatINR(totalPayable)}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed">
                  <span className="text-muted-foreground">Your Wallet Balance</span>
                  <span className={`font-semibold ${hasInsufficientBalance ? "text-red-500" : "text-green-600"}`}>
                    {formatINR(walletBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-3 border-t">
                  <span className="font-medium">Balance After Deduction</span>
                  <span className={`font-bold ${hasInsufficientBalance ? "text-red-500" : "text-green-600"}`}>
                    {hasInsufficientBalance ? (
                      <span className="flex items-center gap-2">
                        
                        Insufficient Balance
                      </span>
                    ) : (
                      formatINR(walletBalance - totalPayable)
                    )}
                  </span>
                </div>
              </div>

              {hasInsufficientBalance && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    
                    You need to add {formatINR(totalPayable - walletBalance)} to your wallet to create this campaign.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      navigate("/sponsor/wallet");
                    }}
                  >
                    Go to Wallet
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isCreating}
            >
              Go Back & Edit
            </Button>
            <Button
              onClick={handleConfirmCreate}
              disabled={isCreating || hasInsufficientBalance}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  
                  Creating...
                </>
              ) : (
                <>
                  
                  Confirm & Create {tierSelections.length > 1 ? `${tierSelections.length} Campaigns` : "Campaign"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isPopupOpen && (
        <CreatorListPopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          creators={selectedCreators}
          tierName={selectedTierName}
        />
      )}
    </div>
  );
}
