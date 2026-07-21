import { hexToRgb } from "./color";

interface NamedColor {
  name: string;
  r: number;
  g: number;
  b: number;
}

const COLOR_MAP: Record<string, string> = {
  Black: "#000000", White: "#ffffff", Silver: "#c0c0c0", Gray: "#808080",
  "Dim Gray": "#696969", Charcoal: "#36454f", "Slate Gray": "#708090",
  Red: "#ff0000", Crimson: "#dc143c", Firebrick: "#b22222", "Dark Red": "#8b0000",
  Maroon: "#800000", Tomato: "#ff6347", Salmon: "#fa8072", Coral: "#ff7f50",
  "Indian Red": "#cd5c5c", Terracotta: "#c65d3b", Brick: "#9c342a",
  Orange: "#ffa500", "Dark Orange": "#ff8c00", Pumpkin: "#e07b00", Amber: "#ffbf00",
  Gold: "#ffd700", Goldenrod: "#daa520", Yellow: "#ffff00", Khaki: "#c3b091",
  Mustard: "#e1ad01", Cream: "#fffdd0", Ivory: "#fffff0", Beige: "#f5f5dc",
  Tan: "#d2b48c", Sand: "#c2b280", Ochre: "#cc7722", Sienna: "#a0522d",
  "Burnt Sienna": "#8a3324", Umber: "#635147", "Raw Umber": "#826644",
  Chocolate: "#7b3f00", Brown: "#8b5a2b", Coffee: "#6f4e37", Wheat: "#f5deb3",
  Olive: "#808000", "Olive Drab": "#6b8e23", Chartreuse: "#7fff00",
  Lime: "#bfff00", "Yellow Green": "#9acd32", Green: "#2e8b57", "Forest Green": "#228b22",
  "Dark Green": "#006400", Sage: "#9caf88", Fern: "#5a8f4e", Emerald: "#2ecc71",
  Mint: "#98ff98", Teal: "#008080", Pine: "#2f6f6a", "Sea Green": "#2e8b57",
  Turquoise: "#40e0d0", Aqua: "#00ffff", Cyan: "#00b7c2", "Sky Blue": "#87ceeb",
  "Light Blue": "#add8e6", "Powder Blue": "#b0e0e6", Cornflower: "#6495ed",
  "Steel Blue": "#4682b4", Cerulean: "#2a52be", Blue: "#1f57c3", "Royal Blue": "#4169e1",
  Navy: "#000080", "Midnight Blue": "#191970", Indigo: "#4b0082", "Slate Blue": "#6a5acd",
  Periwinkle: "#ccccff", Lavender: "#b57edc", Purple: "#800080", Violet: "#8f00ff",
  Plum: "#8e4585", Orchid: "#da70d6", Magenta: "#c71585", Fuchsia: "#ff00ff",
  Pink: "#ffc0cb", "Hot Pink": "#ff69b4", Rose: "#e75480", Blush: "#de5d83",
  Mauve: "#b784a7", Peach: "#ffcba4", Apricot: "#fbceb1", Bisque: "#ffe4c4",
  "Off White": "#f4efe6", Bone: "#e3dac9", Taupe: "#8b8589", Stone: "#928e85",
};

const NAMED_COLORS: NamedColor[] = Object.entries(COLOR_MAP).map(([name, hex]) => {
  const [r, g, b] = hexToRgb(hex);
  return { name, r, g, b };
});

/** Nearest named color using a cheap perceptual (weighted RGB) distance. */
export function nearestName(r: number, g: number, b: number): string {
  let best = NAMED_COLORS[0];
  let bestD = Infinity;
  for (const c of NAMED_COLORS) {
    const rm = (c.r + r) / 2;
    const dr = c.r - r;
    const dg = c.g - g;
    const db = c.b - b;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}
