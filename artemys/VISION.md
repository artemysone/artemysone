# Artemys — Career Wallet

A blockchain-verifiable professional career wallet that is portable, mobile-first, and built on Base. The user never sees the crypto — they just know the trust is there.

## The Problem

1. **Agent spam is killing hiring.** Agents can apply to thousands of jobs at volume, effectively destroying inbound hiring channels. Employers can't trust signal anymore.
2. **Resumes are broken.** Static documents full of unverified claims. A lossy compression of who someone actually is.
3. **Background checks are expensive theater.** A $4B+ industry that mostly calls HR and confirms dates. Slow, costly, and still misses things.
4. **LinkedIn is stale.** Built for recruiters, not for the people on it. Young builders don't think in bullet points — they think in projects.

## The Vision

Kill the traditional resume. Build a new professional identity layer where your work speaks for itself and every claim is cryptographically verified — without the user ever touching a wallet, signing a transaction, or seeing the word "blockchain."

If you're going to beat LinkedIn's data moat, you go for young generations first. They haven't built switching costs. Capture them at their first hackathon, their first side project, their first internship — and by the time they're senior, their entire professional identity lives in Artemys.

## The Product: 4 Layers

### Layer 1: The Gallery (Ship First)
Project-first gallery where builders showcase their work through two first-class formats: a single short demo video or an image gallery. This is the hook — the thing people actually want to use.

- 1 demo video, max 10s
- 1-5 images as a first-class gallery format
- Rich project posts with descriptions, tech stacks, and media
- Tagged collaborators (social now, cryptographically linked later)
- A feed to see what people you follow are building
- Explore / Search to help good projects get discovered
- The vibe should make a 22-year-old designer or developer think "I want to post here"

Think: LinkedIn + GitHub + Instagram (the cool creative side) + YouTube profile.

### Layer 2: The Verification (Add Quietly)
On-chain attestations for project contributions, added behind the scenes. When a collaborator confirms "yes, this person worked on this with me," that's an attestation on Base. Users see "Verified." Employers see cryptographic proof.

- Verified contributor badges on projects
- Mutual attestation between collaborators
- No blockchain language visible to users — just trust signals

### Layer 3: The Credentials (Partner & Grow)
A wallet of verified education, employment history, and certifications. Each credential is cryptographically attested by the issuing institution.

- Credential cards with institution branding and verified checkmarks
- Trust Score based on number and quality of verified credentials
- Partner with universities and bootcamps first (it's marketing for them), then employers
- Each verified credential replaces one background check — the ROI pitch writes itself

### Layer 4: The Protocol (Become Infrastructure)
Open the verification layer as a protocol on Base. Let other apps query it. Now you're not a platform — you're infrastructure. LinkedIn can't compete with a protocol.

- Open protocol for professional verification
- Any app can query: "Did this person graduate from X? Did they contribute to Y?"
- Artemys is the best client, but the graph isn't trapped
- Portability IS the product promise

## V1 Scope — Project Gallery

Ship the gallery. Nothing else. The core loop: post a project, look good doing it, see what your peers are building, and help the right work get found.

### V1 Features
1. **Sign up / Profile** — name, handle, avatar, bio
2. **Post a project** — video or image gallery, title, description, tags
3. **Profile grid** — 3-column project gallery (the Instagram layout)
4. **Basic feed** — see what people you follow are building
5. **Explore / Search** — keep discovery in V1 even though it started outside the strict scope
6. **Tag collaborators** — social tags, no verification yet (that comes in Layer 2)

### What's NOT in V1
- Credential wallet
- Verification / attestations
- Sponsorship / funding
- Claude Code integration

### V1 Tech Stack
- **Expo** (React Native) — one codebase for iOS, Android, and web
- **Supabase** — auth, Postgres database, file storage, real-time subscriptions
- **Cloudflare** — Stream for video upload/transcoding/playback, R2 for image storage
- Three services, one framework. Everything else is managed. Ship fast, add complexity later.
- Base SDK (OnchainKit) drops into the React ecosystem when it's time for Layer 2.

The gallery is the only layer that stands on its own without needing partnerships, institutional buy-in, or a verification network. Someone can sign up, post a demo video, and immediately have something better than what exists today.

The strategic move: while people are posting projects and tagging collaborators, we're quietly building the professional graph and collaboration history that becomes the verification layer later. We don't announce it — we flip the switch when the density is there.

---

## Future Features

### Project Sponsorship
Since Base is already the underlying infrastructure, sponsorship is a natural extension. Users can send creators $5, $20, $100 to support a project they believe in.

- Micro-sponsorships that actually work because Base transaction costs are negligible
- Real money as a signal — stronger than any LinkedIn endorsement
- Creates a flywheel: builders post → projects get sponsored → builders post more → more builders show up
- Kickstarter energy but lighter weight — tipping, not fundraising
- No new payment infrastructure needed — the Base wallet from the verification layer handles it
- Sponsors get visibility as backers (credibility for them too)

### Claude Code Integration
Direct publish from the development environment to Artemys. Zero-friction path from building to showcasing.

- `artemys publish` command from the terminal
- Pull project metadata from repo (name, description, README)
- Identify collaborators from git history
- Auto-generate demo content or prompt for a video upload
- Create a draft project post ready to review and publish on mobile
- The path from "I just built this" to "it's on my profile" should be one command

### Auto-Generated Project Demos
Pipeline to auto-generate 6-10s demo videos from a GitHub repo, removing the friction of creating a project post.

- **Capture:** For web projects — ephemeral deploy + Playwright captures key screens/interactions. For non-web — pull screenshots/GIFs from the README.
- **Storyboard:** AI (Claude) reads the repo and generates a narrative — what to highlight, in what order, at what pacing.
- **Render:** Remotion compiles the captures + storyboard into a branded 6-10s video — title card, key screens with transitions, tech stack + collaborators closing card.
- Remotion chosen over FFmpeg (too manual), Runway/Sora (hallucination risk), Grok Imagine (generates fake UIs, not the real project). Consistency and truth matter on a trust platform.
- The dream: push to GitHub → webhook → auto-deploy → Playwright captures → Claude storyboards → Remotion renders → draft post appears on your phone ready to publish.

## Design Principles

- **Crypto is invisible.** The user never sees a wallet address, never pays gas, never signs a transaction. They see "verified." Employers see cryptographic proof.
- **Builder-first.** Every decision optimizes for the person making things, not the recruiter browsing profiles.
- **Warm, not corporate.** The app should feel like a creative studio, not a LinkedIn clone. Approachable palette, editorial typography, visual richness.
- **Show, don't list.** Projects over bullet points. Demos over descriptions. Proof over claims.
- **Portable, not locked in.** Open protocol. Your identity is yours. You can leave anytime — and that's why you stay.

## Inspiration

- **Jack Dorsey / Bluesky:** User-owned identity on open protocols. Protocol over platform.
- **Square/Block:** Making complex financial infrastructure invisible to the user.
- **Instagram:** Visual-first social experience that people enjoy using.
- **GitHub:** "Show your work" beats "list your credentials" — extend this beyond developers.
