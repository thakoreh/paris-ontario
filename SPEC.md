# Paris, Ontario — Destination Website & Restaurant Directory

## 1. Concept & Vision

A warm, visually rich tourism website for Paris, Ontario — a charming riverside town with European heritage character on the Grand River. The site should feel like discovering a hidden gem: peaceful, natural, and deeply rooted in history. It combines a modern restaurant directory with community features (upvotes, "what's open now") to become the go-to resource for both visitors and locals.

**Feel:** Like a premium boutique travel magazine meets a community platform. Light, airy, optimistic — the kind of site you bookmark before visiting a town.

---

## 2. Design Language

### Aesthetic Direction
**Reference:** 2025 top-tier tourism destinations (likeovisittromso.no, visitscotland.com) — clean minimalism with rich photography, generous whitespace, and subtle organic warmth. Not corporate, not generic — handcrafted and local-feeling.

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#0D9488` | CTAs, active states, links (teal river blue) |
| `--primary-dark` | `#0F766E` | Hover states |
| `--primary-light` | `#CCFBF1` | Badges, backgrounds |
| `--secondary` | `#78716C` | Secondary text, muted elements |
| `--accent` | `#C2703A` | Heritage warmth (terracotta — heritage, food) |
| `--accent-soft` | `#FEF3E8` | Accent backgrounds |
| `--success` | `#16A34A` | Open now, available |
| `--bg` | `#FDFCFB` | Warm off-white base |
| `--surface` | `#FFFFFF` | Cards, modals |
| `--text` | `#1C1917` | Primary text (warm black) |
| `--text-muted` | `#78716C` | Secondary text |
| `--border` | `#E7E5E4` | Dividers, card borders |
| `--river` | `#0D9488` | River/water references |
| `--leaf` | `#4D7C0F` | Nature, outdoor filters |

### Typography
- **Headings:** `DM Serif Display` — editorial, warm, heritage feel
- **Body:** `Inter` — clean, highly legible, modern
- **Accent/Badges:** `Inter` 500 weight, uppercase tracking

### Spatial System
- Base unit: 4px
- Section padding: 80px (desktop), 48px (mobile)
- Card gap: 24px
- Container max-width: 1280px
- Border radius: 12px (cards), 8px (buttons), 24px (badges)

### Motion Philosophy
- **Entrance:** fade-in + translateY(16px), 400ms ease-out, staggered 80ms between items
- **Hover:** translateY(-2px) + shadow lift, 200ms ease
- **Page transitions:** none ( MPA with Next.js, keep it fast)
- **Filter toggle:** smooth height/opacity, 200ms ease
- **Map markers:** bounce-in on load

### Visual Assets
- **Icons:** Lucide React — consistent 24px stroke icons
- **Photos:** Unsplash (Paris Ontario, Grand River, downtown Paris ON)
- **Map:** Leaflet.js with OpenStreetMap tiles (free, no API key)
- **Decorative:** Subtle grain texture on hero, soft gradient overlays on photos

---

## 3. Layout & Structure

### Homepage
```
[Navbar — sticky, blur backdrop]
[Hero — full-viewport, Grand River photo, headline + CTA + scroll hint]
[About Strip — 3 icon stats (population, river km, heritage age)]
[Featured Restaurants — horizontal scroll cards]
[Directory Preview — grid of 6 restaurants + CTA to full directory]
[Community section — upvotes explanation, community spirit]
[Footer]
```

### Directory Page
```
[Navbar]
[Page Header — title + search bar]
[Filter Bar — horizontal chips: Open Now | WiFi | Wheelchair | Patio | Kid-Friendly]
[Content Area — 2-col: [Restaurant List | Map]]
[Restaurant Cards — photo, name, cuisine, tags, upvotes, open status]
[Footer]
```

### Responsive Strategy
- Mobile-first Tailwind classes
- Directory: single column on mobile, 2-col on tablet+, map toggleable on mobile
- Navbar: hamburger menu on mobile

---

## 4. Features & Interactions

### Restaurant Directory
- **Filter chips:** Toggleable — Open Now, WiFi, Wheelchair Accessible, Patio, Kid-Friendly
- **Search:** Real-time text search on name and cuisine
- **Active filters:** Displayed as dismissible tags below search
- **Empty state:** Friendly message with reset filters CTA

### What's Open Now
- Each restaurant has `hours` object with daily open/close times
- "Open Now" chip: green dot + "Open" or red dot + "Closed"
- Calculated client-side from current local time
- Updates on page load (no live clock needed)

### Upvotes
- Stored in localStorage per restaurant slug
- One upvote per browser (idempotent toggle)
- Shows total count + user's voted state
- Heart icon fills on vote

### Map
- Leaflet.js with OpenStreetMap
- Custom teal markers matching brand
- Click marker → highlight corresponding card + scroll into view
- Map resizes with panel

### Error/Edge States
- No results: illustrated empty state + "Clear filters" button
- Map fails: graceful fallback message
- Images fail: warm gradient placeholder

---

## 5. Component Inventory

### Navbar
- Logo (left): "Paris, Ontario" wordmark
- Links (center): Home, Restaurants, About, Contact
- Mobile: hamburger → slide-down menu
- States: default (transparent on hero), scrolled (white + shadow)

### RestaurantCard
- Photo (aspect 16:9, object-cover)
- Name (DM Serif Display)
- Cuisine tag
- Tag chips (wifi, wheelchair, patio, kid-friendly)
- Open/closed badge
- Upvote button (heart + count)
- States: default, hover (lift), voted (filled heart)

### FilterChip
- Icon + label
- States: inactive (outlined), active (filled primary), hover

### SearchBar
- Magnifier icon
- Placeholder: "Search restaurants or cuisine..."
- Clear button when has value

### MapMarker (custom Leaflet)
- Teal circle with white center dot
- Selected: larger with pulse animation

---

## 6. Technical Approach

### Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS v3
- **Icons:** Lucide React
- **Map:** Leaflet.js + react-leaflet
- **Fonts:** Google Fonts (DM Serif Display, Inter)
- **State:** React useState + localStorage for upvotes

### Data Model
```typescript
interface Restaurant {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  description: string;
  image: string;
  address: string;
  phone: string;
  website: string;
  hours: Record<string, { open: string; close: string }>; // 'monday'...'sunday'
  filters: {
    wifi: boolean;
    wheelchair: boolean;
    patio: boolean;
    kidFriendly: boolean;
  };
  upvotes: number;
  coordinates: { lat: number; lng: number };
}
```

### Architecture
```
src/
├── app/
│   ├── layout.tsx          # Root layout, fonts, Navbar, Footer
│   ├── page.tsx             # Homepage
│   ├── restaurants/
│   │   └── page.tsx         # Directory page
│   └── globals.css          # CSS vars, base styles, animations
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── RestaurantCard.tsx
│   ├── FilterBar.tsx
│   ├── SearchBar.tsx
│   ├── MapView.tsx
│   ├── UpvoteButton.tsx
│   └── Hero.tsx
├── data/
│   └── restaurants.ts       # Mock data (15 restaurants)
├── lib/
│   ├── filters.ts           # Filter logic
│   └── time.ts              # "isOpenNow" utility
└── types/
    └── index.ts             # TypeScript interfaces
```

### GitHub Pages Deployment
- `output: 'export'` in next.config.ts
- `basePath: '/paris-ontario'`
- GitHub Actions workflow (provided in skill)
- Repo: `paris-ontario`

---

## 7. Mock Data — 15 Paris, Ontario Restaurants

1. The Whitetail (Canadian, fine dining)
2. Riviera Italian Kitchen (Italian)
3. Helmer's Grand River Boil (Seafood, riverside)
4. Paris' Burger Co. (Burgers, casual)
5. Stoneflower Coffee (Café)
6. The Garden Bistro (Farm-to-table)
7. McClures Pub (Pub food, historic)
8. Bread & Butter Bakery (Bakery, breakfast)
9. Sakura Sushi (Japanese)
10. Curry Village (Indian)
11. Mama's Pizza (Pizza, family)
12. The Bridge Tea Room (British, afternoon tea)
13. F、河北 House (Chinese)
14. Green Blade Kitchen (Vegan, healthy)
15. Riverside Roasters (Coffee, riverside)
