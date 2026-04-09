export type AssetType = "gameday" | "final-score" | "poster" | "highlight";
export type AssetStatus = "draft" | "published" | "archived";

export interface Asset {
  id: string;
  title: string;
  type: AssetType;
  status: AssetStatus;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  eventDate: string;
  imageUrl: string;
  likes: number;
  likedByAthletes: string[];
  designerName: string;
  createdAt: string;
}

export const MOCK_ASSETS: Asset[] = [
  {
    id: "1",
    title: "Championship Night — Men's Basketball",
    type: "final-score",
    status: "published",
    sport: "Basketball",
    homeTeam: "Falcons",
    awayTeam: "Rivals",
    homeScore: 87,
    awayScore: 74,
    eventDate: "2026-03-12",
    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    likes: 24,
    likedByAthletes: ["athlete-1", "athlete-2"],
    designerName: "Jordan M.",
    createdAt: "2026-03-12T22:30:00Z",
  },
  {
    id: "2",
    title: "Game Day Hype — Women's Soccer",
    type: "gameday",
    status: "published",
    sport: "Soccer",
    homeTeam: "Falcons",
    awayTeam: "Wildcats",
    eventDate: "2026-03-15",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80",
    likes: 31,
    likedByAthletes: ["athlete-1"],
    designerName: "Alex R.",
    createdAt: "2026-03-13T09:00:00Z",
  },
  {
    id: "3",
    title: "Track & Field Regional Meet",
    type: "poster",
    status: "published",
    sport: "Track & Field",
    homeTeam: "Falcons",
    awayTeam: "Regional",
    eventDate: "2026-03-20",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    likes: 18,
    likedByAthletes: ["athlete-2"],
    designerName: "Jordan M.",
    createdAt: "2026-03-13T11:30:00Z",
  },
  {
    id: "4",
    title: "Swim Meet — Final Results",
    type: "final-score",
    status: "published",
    sport: "Swimming",
    homeTeam: "Falcons",
    awayTeam: "Stingrays",
    homeScore: 198,
    awayScore: 145,
    eventDate: "2026-03-10",
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80",
    likes: 12,
    likedByAthletes: [],
    designerName: "Alex R.",
    createdAt: "2026-03-10T20:00:00Z",
  },
  {
    id: "5",
    title: "Volleyball Season Opener",
    type: "gameday",
    status: "draft",
    sport: "Volleyball",
    homeTeam: "Falcons",
    awayTeam: "Sharks",
    eventDate: "2026-03-18",
    imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80",
    likes: 0,
    likedByAthletes: [],
    designerName: "Jordan M.",
    createdAt: "2026-03-13T14:00:00Z",
  },
  {
    id: "6",
    title: "Baseball Home Opener",
    type: "poster",
    status: "published",
    sport: "Baseball",
    homeTeam: "Falcons",
    awayTeam: "Eagles",
    eventDate: "2026-03-22",
    imageUrl: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80",
    likes: 9,
    likedByAthletes: ["athlete-1"],
    designerName: "Alex R.",
    createdAt: "2026-03-12T08:00:00Z",
  },
];

export const SPORTS = [
  "Basketball",
  "Soccer",
  "Football",
  "Squash",
  "Baseball",
  "Softball",
  "Volleyball",
  "Swimming",
  "Tennis",
  "Track & Field",
  "Wrestling",
  "Cross Country",
  "Golf",
  "Lacrosse",
  "Field Hockey",
  "Ice Hockey",
  "Water Polo",
  "Badminton",
  "Rowing",
  "Fencing",
  "Gymnastics",
];

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "gameday", label: "Game Day Hype" },
  { value: "final-score", label: "Final Score" },
  { value: "poster", label: "Event Poster" },
  { value: "highlight", label: "Highlight Graphic" },
];
