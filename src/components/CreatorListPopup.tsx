import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/api";

interface Creator {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  instagram_followers: number;
  avg_views: number;
  avg_likes: number;
  city?: string;
  gender?: string;
  niche?: string;
}

const NICHE_OPTIONS = ["Music", "Fashion", "Lifestyle", "Dance", "Fitness", "Comedy"];

export function CreatorListPopup({ 
  isOpen, 
  onClose, 
  creators, 
  tierName,
  onAddSelectedCreators
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  creators: Creator[]; 
  tierName: string;
  onAddSelectedCreators?: (selected: Creator[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedEngagement, setSelectedEngagement] = useState("Any");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedIds, setSelectedIds] = useState<number[]>(creators.map(c => c.id));

  const filteredCreators = useMemo(() => {
    return creators.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.handle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = selectedGender === "All" || (c.gender && c.gender.toLowerCase() === selectedGender.toLowerCase());
      const matchesLocation = selectedLocation === "All Locations" || c.city === selectedLocation;
      const matchesNiche = selectedNiches.length === 0 || (c.niche && selectedNiches.includes(c.niche));
      
      let matchesEngagement = true;
      const engRate = c.avg_likes && c.instagram_followers ? (c.avg_likes / c.instagram_followers) * 100 : 4.5;
      if (selectedEngagement === "1%+") matchesEngagement = engRate >= 1;
      if (selectedEngagement === "3%+") matchesEngagement = engRate >= 3;
      if (selectedEngagement === "5%+") matchesEngagement = engRate >= 5;

      return matchesSearch && matchesGender && matchesLocation && matchesNiche && matchesEngagement;
    }).sort((a, b) => {
      if (sortBy === "followers_desc") return b.instagram_followers - a.instagram_followers;
      if (sortBy === "followers_asc") return a.instagram_followers - b.instagram_followers;
      if (sortBy === "views") return b.avg_views - a.avg_views;
      return 0;
    });
  }, [creators, searchQuery, selectedGender, selectedLocation, selectedNiches, selectedEngagement, sortBy]);

  const toggleCreatorSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCreators.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCreators.map(c => c.id));
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedGender("All");
    setSelectedEngagement("Any");
    setSelectedNiches([]);
    setSelectedLocation("All Locations");
  };

  const selectedCount = selectedIds.length;
  const selectedCreatorObjects = creators.filter(c => selectedIds.includes(c.id));

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div
        className="fixed inset-4 sm:inset-12 z-50 bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center bg-card">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Select Creators – {tierName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose creators from this tier to add to your campaign
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
        
        {/* Body Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Filter Sidebar */}
          <div className="w-full md:w-64 border-r border-border p-4 bg-muted/20 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-xs text-foreground">Filters</h3>
              <button 
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Clear All
              </button>
            </div>

            {/* Search */}
            <div>
              <Input 
                placeholder="Search username or name..." 
                className="bg-background text-xs h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="bg-background text-xs h-8">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Locations" className="text-xs">All Locations</SelectItem>
                  <SelectItem value="Mumbai, India" className="text-xs">Mumbai, India</SelectItem>
                  <SelectItem value="Delhi, India" className="text-xs">Delhi, India</SelectItem>
                  <SelectItem value="Bangalore, India" className="text-xs">Bangalore, India</SelectItem>
                  <SelectItem value="Pune, India" className="text-xs">Pune, India</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
              <div className="flex gap-1.5">
                {["All", "Male", "Female"].map(gender => (
                  <button
                    key={gender}
                    onClick={() => setSelectedGender(gender)}
                    className={`flex-1 py-1 text-xs font-medium rounded border transition-colors ${
                      selectedGender === gender 
                        ? "bg-foreground text-background border-foreground" 
                        : "bg-background border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* Engagement Rate */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Engagement Rate</label>
              <div className="flex flex-wrap gap-1.5">
                {["Any", "1%+", "3%+", "5%+"].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSelectedEngagement(rate)}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                      selectedEngagement === rate 
                        ? "bg-foreground text-background border-foreground" 
                        : "bg-background border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Niche */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Content Niche</label>
              <div className="space-y-1.5">
                {NICHE_OPTIONS.map(niche => {
                  const isChecked = selectedNiches.includes(niche);
                  return (
                    <label key={niche} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox 
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedNiches([...selectedNiches, niche]);
                          else setSelectedNiches(selectedNiches.filter(n => n !== niche));
                        }}
                      />
                      <span>{niche}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Creators List */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <div className="p-3 border-b border-border flex justify-between items-center bg-card">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-xs text-foreground">Creators ({filteredCreators.length})</span>
                <button 
                  onClick={handleSelectAll}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  {selectedIds.length === filteredCreators.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[130px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance" className="text-xs">Relevance</SelectItem>
                    <SelectItem value="followers_desc" className="text-xs">Followers: High to Low</SelectItem>
                    <SelectItem value="followers_asc" className="text-xs">Followers: Low to High</SelectItem>
                    <SelectItem value="views" className="text-xs">Avg Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredCreators.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  <p className="font-medium">No creators match your filters</p>
                  <p className="mt-1">Try clearing some filters to see more results</p>
                </div>
              ) : (
                filteredCreators.map((creator) => {
                  const isSelected = selectedIds.includes(creator.id);
                  const followersFormatted = creator.instagram_followers > 1000 
                    ? `${(creator.instagram_followers / 1000).toFixed(1)}K` 
                    : creator.instagram_followers.toString();
                  const viewsFormatted = creator.avg_views > 1000 
                    ? `${(creator.avg_views / 1000).toFixed(0)}K` 
                    : (creator.avg_views || 250).toString();
                  const pricePerReel = formatINR(Math.round(800 + (creator.instagram_followers * 0.05)));

                  return (
                    <div 
                      key={creator.id}
                      onClick={() => toggleCreatorSelection(creator.id)}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected 
                          ? "border-foreground bg-muted/20" 
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleCreatorSelection(creator.id)}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-xs sm:text-sm text-foreground">{creator.name}</h4>
                            <span className="text-[10px] text-muted-foreground font-medium">Verified</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{creator.handle || `@${creator.name.toLowerCase().replace(/\s+/g, "")}`}</p>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {creator.city || "Mumbai, India"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <div className="font-bold text-foreground">{followersFormatted}</div>
                          <div className="text-[10px] text-muted-foreground">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-foreground">4.6%</div>
                          <div className="text-[10px] text-muted-foreground">Eng. Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-foreground">{viewsFormatted}K</div>
                          <div className="text-[10px] text-muted-foreground">Avg. Views</div>
                        </div>
                      </div>

                      {/* Price & Add Button */}
                      <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
                        <div className="text-right">
                          <div className="font-bold text-foreground text-xs">{pricePerReel}</div>
                          <div className="text-[10px] text-muted-foreground">per reel</div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className="text-xs h-7 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCreatorSelection(creator.id);
                          }}
                        >
                          {isSelected ? "Added" : "Add"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer / Bottom Bar */}
        <div className="p-3 sm:p-4 border-t border-border bg-card flex justify-between items-center">
          <span className="font-medium text-xs text-foreground">{selectedCount} creators selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                if (onAddSelectedCreators) onAddSelectedCreators(selectedCreatorObjects);
                onClose();
              }}
              className="text-xs h-8 font-semibold px-4"
            >
              Add {selectedCount} Creators
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
