# Artemys

Career wallet — a mobile-first project gallery where builders showcase their work. Built on Base (blockchain invisible to users).

**Read [VISION.md](VISION.md) for full product context** — the 4-layer strategy, V1 scope, future features (sponsorship, auto-demo pipeline, Claude Code integration), and design principles. If you're making product or architecture decisions, check the vision first.

## Stack

- **Expo** (React Native) — iOS, Android, web from one codebase
- **Supabase** — auth, Postgres, storage, real-time
- **Cloudflare** — Stream for video, R2 for images

## Project Structure

```
artemys/
├── VISION.md          # Product vision, 4 layers, V1 scope, future features
├── index.html         # Full concept prototype (all 4 layers)
├── v1.html            # V1 prototype (gallery only — Feed, Create, Profile)
└── app/               # Expo project
    ├── app/
    │   ├── _layout.tsx              # Root layout, font loading
    │   └── (tabs)/
    │       ├── _layout.tsx          # 3-tab nav: Feed, Create, Profile
    │       ├── index.tsx            # Feed screen
    │       ├── create.tsx           # New Project screen
    │       └── profile.tsx          # Profile + project grid
    ├── constants/
    │   ├── Colors.ts                # Design tokens
    │   └── Typography.ts            # Font mappings
    └── lib/
        └── supabase.ts              # Supabase client
```

## V1 Scope (what we're building)

1. Sign up / Profile — name, handle, avatar, bio
2. Post a project — video/images, title, description, tags
3. Profile grid — 3-column project gallery
4. Basic feed — see what people you follow are building
5. Tag collaborators — social tags, no verification yet

Everything else (explore, wallet, verification, sponsorship) is future.

## Design System

- **Palette**: Warm cream (`#FAF7F2`), terracotta accent (`#E07A5F`), gold (`#F2CC8F`)
- **Typography**: Bricolage Grotesque (display), Source Serif 4 (project titles), DM Sans (body)
- **Tokens**: Use `colors`, `spacing`, `radius` from `constants/Colors.ts` and `fonts` from `constants/Typography.ts` — don't hardcode values

## Commands

```bash
cd app
npx expo start          # Dev server (press w for web, i for iOS sim)
npx expo start --web    # Web only
npx expo export --platform web  # Build check
```

## Conventions

- Use `FlatList` for any list that will grow (not `ScrollView`)
- Supabase env vars go in `app/.env` (see `.env.example`)
- No blockchain/crypto language in the UI — users see "verified," not "on-chain"
