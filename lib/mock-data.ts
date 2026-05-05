import {
  BriefcaseBusiness,
  Music,
  Tag,
  Video,
  type LucideIcon,
} from "lucide-react";

export type PlatformId = "upwork" | "fiverr" | "youtube" | "spotify";

export type Platform = {
  id: PlatformId;
  name: string;
  icon: LucideIcon;
};

export const PLATFORMS: readonly Platform[] = [
  { id: "upwork", name: "Upwork", icon: BriefcaseBusiness },
  { id: "fiverr", name: "Fiverr", icon: Tag },
  { id: "youtube", name: "YouTube", icon: Video },
  { id: "spotify", name: "Spotify", icon: Music },
];

export const MOCK_USER = {
  name: "Maria Silva",
  platform: "Upwork",
  avgMonthlyEarnings: 1247,
  completionRate: 0.87,
  monthsActive: 14,
  pendingPayouts: 487,
  maxAdvance: 347,
};

export const FEE_PERCENTAGE = 0.02;
export const REPAYMENT_DAYS = 14;
