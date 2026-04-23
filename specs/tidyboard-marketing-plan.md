# Tidyboard — Marketing Plan & SEO Strategy

**Version:** 1.0  
**Date:** April 12, 2026  
**Companion to:** tidyboard-spec.md

---

## 1. Market Context

### 1.1 The Opportunity

The family calendar/dashboard market is dominated by proprietary hardware devices at premium price points:

| Product | Hardware Cost | Subscription | Total Year-1 Cost |
|---|---|---|---|
| Hearth Display | $699 | $86.40/year (required for full features) | $785 |
| Skylight Calendar Max | $599 | $79/year (required) | $678 |
| Cozyla Calendar+ 2 | $399 | Optional premium | $399+ |
| DAKboard | $0 (BYO screen) | $60/year | $60 |
| Mango Display | $0 (BYO screen) | $60/year | $60 |
| **Tidyboard (self-hosted)** | **$0** | **$0** | **$0** |
| **Tidyboard Cloud (Family)** | **$0** | **$49/year** | **$49** |

The smart home market is projected to reach $133B in 2026, with open-source platforms growing at 18.6% CAGR as users demand flexibility and vendor independence.

### 1.2 Target Audiences

**Primary: Tech-savvy parents (25–45)**
- Self-host their own services (Nextcloud, Home Assistant, Plex)
- Value data ownership and privacy
- Comfortable with Docker Compose
- Active on Reddit (r/selfhosted, r/homelab, r/homeassistant, r/parenting)
- Discovery: Hacker News, GitHub Trending, tech blogs

**Secondary: Budget-conscious families**
- Want Hearth/Skylight features without the $700+ price tag
- Own old tablets gathering dust (repurpose as family dashboard)
- Discovery: "Hearth Display alternative" Google searches, parenting blogs, YouTube reviews

**Tertiary: Tidyboard Cloud customers**
- Non-technical families who want the features without self-hosting
- Discovered via comparison articles, social media, word of mouth
- Willing to pay $4.99/month for zero-setup convenience

---

## 2. Positioning & Messaging

### 2.1 Core Positioning

**"The family dashboard you actually own."**

Tidyboard is the open-source alternative to Hearth Display and Skylight Calendar. Free forever when self-hosted. Runs on any tablet, phone, or browser — no $700 proprietary hardware required.

### 2.2 Key Messages (by audience)

**For self-hosters:**
- "One `docker compose up` and your family dashboard is live. No vendor lock-in, no cloud dependency, no subscription. Your data stays on your server."
- "Built with Go, PostgreSQL, and React. Open source under AGPL. Contribute, fork, or just use it."

**For budget-conscious families:**
- "That old iPad in your drawer? It's about to become your family command center. Tidyboard turns any tablet into a smart family calendar — free."
- "Everything Hearth Display does for $700. Tidyboard does for $0. Or $4.99/month if you don't want to think about servers."

**For Tidyboard Cloud prospects:**
- "Family organized in 60 seconds. No tech skills needed. Sign up, add your family, sync your calendars. Done."

### 2.3 Differentiation Matrix

| Claim | vs. Hearth | vs. Skylight | vs. Mango/Cozi |
|---|---|---|---|
| Free & open source | ✅ (they're $699+sub) | ✅ ($599+sub) | Partially (they're SaaS-only) |
| Runs on your hardware | ✅ (proprietary device) | ✅ (proprietary) | ✅ (limited device support) |
| Self-hosted option | ✅ (cloud only) | ✅ (cloud only) | ✅ (cloud only) |
| Recipe database + URL import | ✅ (none) | ✅ (none) | ✅ (none) |
| Gamification/races for kids | ✅ (basic chores) | ✅ (basic chores) | ✅ (none) |
| CalDAV support | ✅ (Google/Outlook only) | ✅ (Google only) | Varies |
| Full API | ✅ (none) | ✅ (none) | ✅ (limited) |

---

## 3. Content Marketing Strategy

### 3.1 Blog (tidyboard.dev/blog)

Content pillars, frequency, and SEO purpose:

**Pillar 1: Comparison content (months 1–3, highest SEO priority)**
- "Tidyboard vs Hearth Display: Feature Comparison" — targets "Hearth Display alternative"
- "Tidyboard vs Skylight Calendar: What's Different" — targets "Skylight alternative"
- "Best Open Source Family Calendar Apps in 2026" — targets category search
- "Hearth Display Review: Is It Worth $700?" — targets brand-name searchers
- "Free Alternatives to Skylight Calendar" — targets price-sensitive searchers
- "Turn an Old iPad Into a Family Dashboard (Free)" — targets "old iPad uses" + family tech

**Pillar 2: How-to / setup guides (months 2–4)**
- "How to Set Up Tidyboard on a Raspberry Pi in 10 Minutes"
- "Self-Hosting Tidyboard with Docker Compose: Complete Guide"
- "Syncing Google Calendar with Tidyboard (Step by Step)"
- "Setting Up Tidyboard as a Kitchen Kiosk on Android"
- "Tidyboard + Home Assistant: Automation Ideas"
- "How to Import Recipes from Any Website (Like Paprika)"

**Pillar 3: Parenting + family organization (months 3–6)**
- "How We Gamified Chores and Our Kids Actually Do Them Now"
- "The Family Dashboard That Replaced Our Paper Calendar"
- "Meal Planning for Families: From Recipe to Shopping List in One App"
- "Teaching Kids Responsibility with Visual Routines"
- "Weekly Meal Prep: How Auto-Generated Shopping Lists Saved Us 2 Hours"

**Pillar 4: Technical / development (ongoing)**
- "Building a Go + Lambda Application with Zero Cold Start Pain"
- "How sqlc Changed How We Write Database Code"
- "Scraping Recipes from Any Website with Go and JSON-LD"
- "Open-Source Monetization: Our AGPL + Managed Cloud Model"
- Monthly changelog / release notes

### 3.2 Publishing Cadence

| Month | Posts | Focus |
|---|---|---|
| 1 (launch) | 4 | 2 comparison, 1 setup guide, 1 announcement |
| 2 | 3 | 1 comparison, 1 how-to, 1 technical |
| 3 | 3 | 1 parenting, 1 how-to, 1 technical |
| 4–6 | 2/month | Mix of pillars based on search data |
| 7+ | 2/month | Driven by keyword research + community requests |

---

## 4. SEO Strategy

### 4.1 Keyword Targets

**Tier 1: High-intent, moderate competition (attack first)**

| Keyword | Monthly Volume (est.) | Difficulty | Content |
|---|---|---|---|
| hearth display alternative | 2,000–5,000 | Medium | Comparison page |
| skylight calendar alternative | 5,000–10,000 | Medium | Comparison page |
| free family calendar app | 3,000–8,000 | High | Category page |
| family dashboard app | 1,000–3,000 | Low-Medium | Homepage + blog |
| open source family calendar | 500–1,500 | Low | Blog post + README |
| digital family calendar | 5,000–12,000 | High | Blog + comparison |
| best family organizer app 2026 | 2,000–5,000 | Medium | Roundup post |

**Tier 2: Long-tail, low competition (quick wins)**

| Keyword | Monthly Volume (est.) | Difficulty | Content |
|---|---|---|---|
| turn old ipad into family calendar | 500–1,500 | Low | How-to guide |
| self hosted family calendar | 300–800 | Low | Setup guide |
| hearth display review | 1,000–3,000 | Medium | Review/comparison |
| family chore chart app gamification | 200–600 | Low | Feature page |
| recipe url import like paprika | 200–500 | Low | Feature page |
| meal planning shopping list app free | 500–1,500 | Medium | Blog post |
| skylight calendar worth it | 1,000–3,000 | Medium | Comparison |
| family kiosk tablet setup | 200–500 | Low | How-to guide |

**Tier 3: Brand awareness (build over time)**

| Keyword | Strategy |
|---|---|
| tidyboard | Brand name — own this via homepage, GitHub, social profiles |
| tidyboard vs hearth | Comparison page, ensure we rank for our own brand comparisons |
| tidyboard setup | Documentation, quickstart guide |

### 4.2 On-Page SEO Requirements

Every page on tidyboard.dev must have:
- Unique `<title>` tag (under 60 characters) with primary keyword near the front
- `<meta description>` (under 155 characters) with primary keyword + call to action
- One `<h1>` per page matching the primary keyword
- Proper heading hierarchy (h1 → h2 → h3, no skipping levels)
- Internal links to at least 2 other pages on the site
- At least one image with descriptive `alt` text
- Schema.org structured data (FAQ schema for comparison pages, HowTo schema for guides, SoftwareApplication for the product itself)
- Canonical URL set
- Open Graph tags + Twitter Card tags for social sharing
- Responsive design passing Core Web Vitals (LCP <2.5s, CLS <0.1, INP <200ms)

### 4.3 Technical SEO

**Site architecture:**
```
tidyboard.dev/
├── /                          (homepage — "Open Source Family Dashboard")
├── /features                  (feature overview — all features with anchors)
├── /features/recipes          (recipe database deep-dive)
├── /features/gamification     (gamification deep-dive)
├── /features/meal-planning    (meal planning + shopping lists)
├── /pricing                   (Free vs Cloud tiers)
├── /compare/                  (comparison hub)
│   ├── /compare/hearth        ("Tidyboard vs Hearth Display")
│   ├── /compare/skylight      ("Tidyboard vs Skylight Calendar")
│   ├── /compare/mango         ("Tidyboard vs Mango Display")
│   └── /compare/cozi          ("Tidyboard vs Cozi Family Organizer")
├── /docs/                     (documentation hub)
│   ├── /docs/quickstart
│   ├── /docs/self-hosting
│   ├── /docs/google-sync
│   ├── /docs/kiosk-setup
│   └── /docs/api
├── /blog/                     (blog index)
│   └── /blog/{slug}           (individual posts)
└── /download                  (Docker, binary downloads, Electron app)
```

**Technical requirements:**
- Static site generated (Hugo or Astro) for speed and SEO
- Server-side rendering for all content pages (not SPA — must be crawlable)
- XML sitemap at `/sitemap.xml`, submitted to Google Search Console and Bing Webmaster
- robots.txt allowing full crawl
- Hreflang tags for English and German versions
- Page load <1.5 seconds (static site, CDN-delivered)
- 301 redirects for any URL changes
- Structured data validation via Google Rich Results Test

### 4.4 Link Building Strategy

**Tier 1: Organic / earned (highest value)**
- GitHub README with clear project description, badges, screenshots → GitHub Trending
- Hacker News launch post → "Show HN: Tidyboard — Open source family dashboard (Hearth Display alternative)"
- r/selfhosted post with detailed self-hosting guide
- r/homelab showcase post with kiosk tablet photo
- Product Hunt launch
- Featured in Awesome Self-Hosted list (github.com/awesome-selfhosted/awesome-selfhosted)
- Listed on AlternativeTo.net (as alternative to Hearth Display, Skylight, Cozi)

**Tier 2: Outreach (medium effort)**
- Pitch to self-hosting bloggers and YouTubers for reviews (Techno Tim, DB Tech, Hardware Haven, Wolfgang's Channel, Jeff Geerling if Raspberry Pi angle)
- Pitch to parenting tech bloggers for "free Hearth alternative" angle
- Guest post on "open source monetization" for indie hacker blogs

**Tier 3: Community (ongoing)**
- Answer questions on Stack Overflow, Reddit, and Hacker News about family calendar solutions
- Maintain active GitHub Discussions — every question gets a thoughtful answer
- Respond to Hearth/Skylight complaint threads with "here's an open-source alternative" (be genuine, not spammy)

### 4.5 Content Distribution

Every blog post gets distributed to:
1. Hacker News (if technical or launch-related)
2. Relevant subreddits (r/selfhosted, r/homelab, r/parenting, r/mealprep, r/opensource)
3. Twitter/X with key takeaway + screenshot
4. Mastodon / Fediverse (strong self-hosting community)
5. Dev.to (technical posts)
6. LinkedIn (if parenting/productivity angle)

---

## 5. Launch Strategy

### 5.1 Pre-Launch (4 weeks before v0.1)

- Register tidyboard.dev and tidyboard.cloud domains
- Set up GitHub repository with polished README (screenshots, feature list, quickstart)
- Create "coming soon" landing page with email signup
- Write 2 comparison blog posts (Hearth, Skylight) — publish on launch day
- Record 60-second demo video showing: install → create family → sync calendar → kiosk mode
- Prepare Hacker News, Reddit, and Product Hunt launch posts
- Set up Google Search Console, Google Analytics 4 (privacy-respecting config), Plausible Analytics (self-hosted)

### 5.2 Launch Day (v0.1 release)

**Morning (US timezones):**
1. Tag and release v0.1 on GitHub
2. Publish Docker image to Docker Hub + GitHub Container Registry
3. Publish 2 comparison blog posts + launch announcement post
4. Submit to Hacker News: "Show HN: Tidyboard — Open Source Family Dashboard (Go/React)"
5. Post to r/selfhosted with detailed setup guide
6. Post to r/homelab with kiosk tablet photo
7. Submit to Product Hunt
8. Tweet/toot announcement with demo video

**Evening:**
9. Respond to every Hacker News comment and Reddit reply
10. Update README if common questions emerge
11. Fix any bugs reported within 24 hours

### 5.3 Post-Launch (weeks 1–4)

- Monitor Google Search Console for indexing + early keyword rankings
- Publish 1 blog post per week (how-to guides, responding to launch feedback)
- Submit to Awesome Self-Hosted, AlternativeTo, and other directories
- Reach out to 5 self-hosting YouTubers with personalized pitches
- Collect and publish user testimonials (with permission)
- Start GitHub Discussions community

### 5.4 Growth Phase (months 2–6)

- Publish SEO content on a 2-post/month cadence
- Monitor keyword rankings and adjust content strategy
- A/B test landing page messaging for Cloud signup conversion
- Implement referral program: existing users get 1 month free for each referral
- Launch recipe database and meal planning (v0.2) with dedicated blog post + comparison update
- Attend or sponsor relevant conferences (Self-Hosted Summit, FOSDEM)

---

## 6. Community Building

### 6.1 GitHub as Community Hub

- **GitHub Discussions**: primary community forum. Categories: Q&A, Feature Requests, Show & Tell, General
- **Good First Issues**: label 10+ issues for new contributors at all times
- **Contributing Guide**: clear, welcoming, with development setup instructions
- **Issue templates**: bug report, feature request, recipe scraper request (for new site support)
- **Monthly community update**: GitHub Discussion post summarizing what shipped, what's coming, contributor shoutouts

### 6.2 Social Presence

| Platform | Handle | Content Focus |
|---|---|---|
| GitHub | tidyboard/tidyboard | Code, issues, releases, community |
| Twitter/X | @tidyboard | Feature previews, tips, user showcases |
| Mastodon | @tidyboard@fosstodon.org | Self-hosting community, FOSS values |
| Reddit | u/tidyboard_official | Engagement in r/selfhosted, r/homelab |
| YouTube | Tidyboard | Setup tutorials, feature demos, release walkthroughs |
| Discord | tidyboard | Real-time community chat (if demand warrants) |

### 6.3 User-Generated Content

- Encourage users to share their kiosk setups (photos of tablets on walls, kitchen counters)
- "Setup of the Month" showcase in monthly community update
- Recipe collection sharing between households (future feature → community cookbook)
- Community animation packs (Lottie files for celebration animations)
- Community badge designs (SVG badge packs)

---

## 7. Paid Acquisition (Tidyboard Cloud only, Phase 2)

**Not for launch.** Only after organic channels prove product-market fit and conversion works.

### 7.1 When to Start Paid

Prerequisites before spending on ads:
- ≥100 organic Cloud signups
- Cloud signup → active user conversion ≥40%
- Free → paid tier conversion ≥10%
- LTV:CAC ratio ≥3:1 projected from organic data

### 7.2 Channels (when ready)

**Google Ads:**
- Target keywords: "family calendar app", "hearth display alternative", "skylight calendar alternative"
- Landing page: /compare/hearth or /compare/skylight (not homepage)
- Budget: start at $500/month, measure CPA, scale if CPA < $20

**Reddit Ads:**
- Target subreddits: r/parenting, r/daddit, r/mommit, r/mealprep
- Creative: "Your old iPad is about to become your family's best organizational tool"
- Budget: $300/month

**YouTube Pre-Roll:**
- Target: family organization, parenting, meal prep channels
- 15-second pre-roll showing the kiosk tablet in action
- Budget: $500/month

---

## 8. Metrics & KPIs

### 8.1 Awareness Metrics

| Metric | Target (6 months) | Target (12 months) |
|---|---|---|
| GitHub stars | 1,000 | 5,000 |
| Monthly website visitors | 10,000 | 50,000 |
| Docker Hub pulls | 5,000 | 25,000 |
| Newsletter subscribers | 500 | 2,000 |
| YouTube subscribers | 200 | 1,000 |

### 8.2 Acquisition Metrics

| Metric | Target (6 months) | Target (12 months) |
|---|---|---|
| Cloud signups (free) | 500 | 3,000 |
| Cloud paid subscribers | 50 | 400 |
| Self-hosted installations (estimated via Docker pulls × 0.3) | 1,500 | 7,500 |
| GitHub contributors | 15 | 40 |

### 8.3 SEO Metrics

| Metric | Target (6 months) | Target (12 months) |
|---|---|---|
| Ranking keywords (top 10) | 20 | 100 |
| Organic monthly traffic | 5,000 | 30,000 |
| "hearth display alternative" ranking | Top 5 | Top 3 |
| "skylight calendar alternative" ranking | Top 10 | Top 5 |
| "open source family calendar" ranking | #1 | #1 |
| Referring domains | 30 | 100 |

### 8.4 Revenue Metrics (Cloud)

| Metric | Target (6 months) | Target (12 months) |
|---|---|---|
| MRR (monthly recurring revenue) | $250 | $2,000 |
| ARR (annual recurring revenue) | $3,000 | $24,000 |
| Free → paid conversion rate | 10% | 15% |
| Churn rate (monthly) | <5% | <3% |
| Average revenue per user (ARPU) | $5.50 | $6.00 |

---

## 9. Brand Guidelines (Brief)

**Name:** Tidyboard (one word, capital T)  
**Tagline:** "The family dashboard you actually own."  
**Voice:** Warm, practical, no-nonsense. Talk like a parent who also knows Docker. Never corporate-speak.  
**Color palette:** To be defined — lean toward warm, approachable colors (sage green, cream, soft blue) rather than tech-startup neon.  
**Logo:** To be designed — should work at favicon size and on a GitHub README. Simple, recognizable, not clip-art.  
**Photography style:** Real homes, real tablets on real walls, real families (diverse). No stock photography of perfect kitchens.

---

## 10. Budget (Year 1, Bootstrap)

| Category | Monthly | Annual |
|---|---|---|
| Domain registration (tidyboard.dev + .cloud) | — | $30 |
| Hosting for marketing site (Cloudflare Pages / Vercel) | $0 | $0 |
| AWS (staging environment) | $30 | $360 |
| AWS (production, scales with users) | $76–250 | $1,000–3,000 |
| Plausible Analytics (self-hosted) | $0 | $0 |
| Design (logo, brand assets — one-time) | — | $500 |
| Content writing (if outsourced, optional) | $0 | $0 |
| Paid acquisition (phase 2, if/when) | $0–1,300 | $0–15,600 |
| **Total (bootstrap, no paid ads)** | **~$106** | **~$1,890** |

At 50 paid Cloud subscribers ($5/mo), the project covers its own AWS costs. At 400 subscribers, it generates ~$24K ARR — a meaningful side project income or seed for going full-time.

---

## 11. Pre-Launch Legal Checklist

These items must be completed before Tidyboard Cloud goes live:

- [ ] **LLC or business entity** registered (or Stripe Atlas)
- [ ] **UC Davis IP check** — confirm employment agreement does not assign side project IP to the university
- [ ] **Domain registration** — tidyboard.dev and tidyboard.cloud registered and secured
- [ ] **Terms of Service** drafted and reviewed by lawyer
- [ ] **Privacy Policy** drafted — must specifically address child data (COPPA)
- [ ] **Cookie Policy** — minimal (JWT httpOnly cookie, no tracking)
- [ ] **COPPA compliance** — parental consent flow, child data minimization, annual review process
- [ ] **GDPR DPA template** — available for EU Cloud users
- [ ] **AGPL license file** in repository with clear NOTICE file explaining the Cloud boundary
- [ ] **Stripe account** set up with verified business entity
- [ ] **SES production access** — apply for SES sending limits (sandbox only allows verified emails)

---

## 12. Competitive Intelligence (Ongoing)

Monitor competitor movements to adjust positioning:

| Competitor | What to Track | How |
|---|---|---|
| Hearth Display | Pricing changes, new features, subscription model changes | Google Alerts, r/HearthDisplay, App Store reviews |
| Skylight Calendar | New hardware releases, feature updates, pricing | Google Alerts, product review sites |
| Mango Display | Feature additions (closest competitor model — BYO device, SaaS) | GitHub/changelog, website |
| Cozi | Feature changes, pricing, user complaints | App Store reviews, Reddit |
| DAKboard | Open source moves, Raspberry Pi community | GitHub, r/raspberry_pi |

**Quarterly competitive review:** Update comparison pages, adjust messaging if competitors change pricing or add features we already have.

---

## 13. Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Hearth/Skylight drops price dramatically | Reduces our price advantage | Low | Our core advantage is open source + self-hosted, not just price |
| Google/Apple restrict calendar API access | Breaks sync for most users | Low | CalDAV support provides vendor-independent fallback path |
| Recipe site blocks scraping | Popular site returns 403 | Medium | LLM fallback (BYOK), manual entry, community-maintained scraper registry |
| COPPA complaint | Legal exposure for Cloud | Low | Implement compliance before launch, not after |
| Single developer burnout | Development stalls | Medium | Build community early, prioritize contributor experience, keep scope small |
| GitHub repo takedown/DMCA | Code access disrupted | Very Low | Mirror on GitLab/Codeberg, self-hosted Gitea backup |
