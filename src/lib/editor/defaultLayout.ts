export type CanvasTextElement = {
  id: string;
  key:
    | "topLabel"
    | "headline"
    | "matchLine"
    | "dateTime"
    | "location"
    | "cta"
    | "footer";
  x: number; // px
  y: number; // px
  w: number; // px
  fontSize: number; // px
  align?: "left" | "center" | "right";
  weight?: 400 | 600 | 700 | 800 | 900;
  uppercase?: boolean;
  tracking?: "tight" | "wide" | "widest";
};

export type PostLayout = {
  width: number;
  height: number;
  elements: CanvasTextElement[];
};

export const DEFAULT_POST_LAYOUT: PostLayout = {
  width: 1080,
  height: 1350,
  elements: [
    {
      id: "topLabel",
      key: "topLabel",
      x: 80,
      y: 96,
      w: 920,
      fontSize: 28,
      align: "left",
      weight: 800,
      uppercase: true,
      tracking: "widest",
    },
    {
      id: "headline",
      key: "headline",
      x: 80,
      y: 160,
      w: 920,
      fontSize: 92,
      align: "left",
      weight: 900,
      uppercase: true,
      tracking: "tight",
    },
    {
      id: "matchLine",
      key: "matchLine",
      x: 80,
      y: 320,
      w: 920,
      fontSize: 56,
      align: "left",
      weight: 900,
      uppercase: true,
      tracking: "tight",
    },
    {
      id: "dateTime",
      key: "dateTime",
      x: 80,
      y: 410,
      w: 920,
      fontSize: 32,
      align: "left",
      weight: 700,
      tracking: "wide",
    },
    {
      id: "location",
      key: "location",
      x: 80,
      y: 456,
      w: 920,
      fontSize: 28,
      align: "left",
      weight: 600,
      tracking: "wide",
    },
    {
      id: "cta",
      key: "cta",
      x: 80,
      y: 1140,
      w: 420,
      fontSize: 34,
      align: "center",
      weight: 900,
      uppercase: true,
      tracking: "wide",
    },
    {
      id: "footer",
      key: "footer",
      x: 80,
      y: 1260,
      w: 920,
      fontSize: 22,
      align: "left",
      weight: 700,
      tracking: "wide",
    },
  ],
};

