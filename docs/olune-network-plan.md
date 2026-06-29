# Olune Network — Product & Phase Plan

**Document status:** Planning draft — June 2026  
**Classification:** Internal strategy  
**Author:** Tasman Davids

---

## Executive Summary

Olune Network is a two-sided instructor marketplace built within the Olune ecosystem. It connects performing arts studios and sports clubs (demand) with freelance, contract, and touring instructors (supply) — across two distinct use cases: **local cover teaching** (last-minute substitution) and **international guest teaching** (summer schools, masterclasses, intensives, residencies).

No professional platform exists for this in the performing arts world. Studios currently navigate a fragmented landscape of personal networks, Facebook groups, and Instagram DMs. Olune Network professionalises this entirely — with searchable profiles, live availability, verified credentials, direct messaging, and eventually formalised booking and payment.

The cold-start problem that kills most two-sided marketplaces does not apply here. Olune already owns the demand side (studios on the platform), and Tasman's personal network as the first Australasian graduate of the Vaganova Academy seeds the high-quality supply side from day one.

---

## The Problem

When a studio's instructor calls in sick on Thursday morning, the owner spends 45 minutes texting former students, posting in Facebook groups, and calling contacts — hoping someone is available. There is no searchable, availability-aware directory of qualified performing arts instructors.

When a studio wants to elevate their summer intensive by bringing in a guest teacher from the Royal Ballet School or Bolshoi Academy, they rely entirely on who they personally know, or who they happened to meet at a conference. There is no platform where internationally credentialed teachers list themselves as available for guest engagements.

Both problems are real, recurring, and currently solved by nothing better than a WhatsApp group.

---

## The Opportunity

| Segment | Problem | Frequency | Willingness to Pay |
|---|---|---|---|
| Local cover | Last-minute sick cover | Weekly for large studios | Medium (saves panic, lost revenue) |
| Regional guest | Workshops, holiday programs | Monthly–quarterly | Medium–high |
| International guest | Summer schools, masterclasses, residencies | 1–3× per year | High (prestige, premium pricing) |
| Touring instructor | Income stream while travelling | Ongoing | High (new income source) |

The international segment is the most underserved and commands the highest value. A guest teacher from a prestigious institution can earn NZD $500–$2,000+ per day. Studios routinely budget NZD $5,000–$20,000 for a week-long intensive featuring guest faculty. The transaction value makes a platform fee economically viable from a small number of bookings.

---

## Competitive Landscape

| Platform | Scope | Performing Arts Depth | Availability | Booking | Status |
|---|---|---|---|---|---|
| ClassCover (AU) | Schools only | None | Yes | No | Active, wrong market |
| Gig-E / Bark | Generalist | None | No | Basic | Wrong audience |
| LinkedIn | Professional | None | No | No | No fit |
| Facebook Groups | Informal | Community-driven | No | No | Incumbent behaviour |
| **Olune Network** | Performing arts + sports | Deep | Yes | Yes (Phase 2+) | Planned |

There is no direct competitor in performing arts. This is a genuine white space.

---

## Strategic Fit Within Olune

Olune Network is not a separate product — it is a growth engine and retention layer built on top of the core platform.

**Acquisition loop:** An international instructor creates a Network profile → discovers Olune → recommends it to their home studio → new studio signs up for the core platform.

**Retention loop:** A studio that regularly uses Network to find cover teachers and guest faculty cannot easily leave Olune without losing access to their booking history, instructor relationships, and reviews. The switching cost compounds over time.

**Premium tier lever:** Network features (verified credentials, priority search placement, international booking tools) are bundled into Pro and Enterprise studio plans — increasing ARPU without increasing price.

---

## Platform Design

### Two Sides

**Supply — Instructors**
Freelancers, semi-retired performers, touring teachers, full-time studio teachers who take occasional guest work. They create profiles, set availability, and receive inquiries.

**Demand — Studios & Clubs**
Organisations on Olune (or open to any studio for the Network standalone). They search, filter, and send booking inquiries.

### Instructor Profile Schema

| Field | Type | Notes |
|---|---|---|
| Full name + headshot | Text / image | |
| Home base + region | Location | Used for proximity search |
| Disciplines | Multi-select | Ballet, contemporary, jazz, tap, hip-hop, musical theatre, etc. |
| Syllabus certifications | Multi-select | RAD, ISTD, CSTD, NZAMD, BATD, Cecchetti, ADAPT, etc. |
| Training institution(s) | Text | Vaganova Academy, RBS, NZSD, VCA, etc. |
| Performance history | Rich text | Companies, productions, roles |
| Teaching experience | Rich text | Years, age groups, levels taught |
| Age groups | Multi-select | Early childhood / Primary / Secondary / Adult / Vocational |
| Engagement types | Multi-select | One-off cover / Workshop / Week intensive / Summer school / Residency |
| Availability type | Multi-select | Local cover / Regional / International travel |
| Work authorisation | Multi-select | Countries where legally able to work |
| Languages | Multi-select | |
| Teaching video | URL embed | YouTube/Vimeo — teaching, not just performance |
| Rate range | Optional range | NZD equivalent, per day |
| Availability calendar | Calendar | Block-out dates, recurring unavailability |
| Verified badge | Boolean | Credentials checked by Olune team |
| Studio reviews | Aggregated | Post-engagement rating + comment |

### Studio Search Filters

- Discipline + syllabus certification
- Availability window (date range picker)
- Engagement type
- Region / "willing to travel to [country]"
- Age groups taught
- Training institution pedigree
- Language
- Verified credentials only (toggle)
- Rate range

### Core Interaction Flow

```
Studio searches with filters
  → Reviews instructor profiles
    → Sends inquiry (dates, location, brief, proposed rate)
      → Instructor accepts / declines / proposes changes
        → Agreement reached
          → Booking confirmed
            → Engagement occurs
              → Both parties leave reviews
```

---

## Phase 0 — Seed (Pre-launch, Month 0–2)

**Objective:** Manually validate the concept and seed the first 20–30 instructor profiles before writing a single line of code.

**Activities:**

- Tasman personally reaches out to 20–30 instructors from his network — Vaganova graduates, RAD examiners, former company dancers who now teach, well-regarded NZ/AU/UK instructors
- Each instructor fills in a Google Form or Notion page with their profile details
- A simple static landing page is built at `network.olune.com` with those profiles — no search, just cards
- Studios on the Olune beta are shown the page and asked: "Would you use this? Have you ever struggled to find a cover teacher or guest faculty?" — formal 5-question survey
- Validate: is the international use case compelling enough to justify the build? Is the local use case the real daily driver?

**Success criteria:**
- 20+ instructor profiles seeded
- 10+ studios respond positively to the survey
- At least 1 organic booking inquiry happens without any product — someone sees a profile and reaches out via email

**What this phase proves:** The market exists. The cold-start problem is solvable through personal network. The demand is real.

**Build required:** Static landing page only. Minimal investment.

---

## Phase 1 — MVP Directory (Months 2–5)

**Objective:** A real, searchable directory with profiles and direct messaging. No booking or payment yet.

**Dependency:** Olune core platform priorities 1–4 must be stable before this begins (go-live hardening, onboarding wizard, Recital Wizard foundation, Parent Achievement Moments).

### Features

**Instructor side:**
- Self-serve profile creation with all schema fields
- Availability calendar (simple block-out, not granular scheduling)
- Teaching video embed (YouTube/Vimeo)
- Profile preview and publish/unpublish toggle
- Notification when an inquiry is received

**Studio side:**
- Search with all filters
- Instructor profile view (full detail)
- Inquiry form (structured: dates, location, engagement type, brief, proposed rate)
- Inquiry status tracking (sent / viewed / responded)

**Platform:**
- In-platform messaging thread per inquiry
- Email notifications for both sides
- Basic profile moderation (manual review before publish for Phase 1)
- Mobile-responsive — studios search on phones

### Technical approach

Network sits as a sub-application within the existing Next.js codebase at `/network` routes, or a dedicated subdomain `network.olune.com`. It shares the Supabase auth and user database but has its own schema tables:

```
network_profiles       — instructor profile data
network_availability   — blocked dates per profile
network_inquiries      — studio → instructor inquiry threads
network_messages       — messages within each inquiry thread
network_reviews        — post-engagement ratings
```

**Auth behaviour:**
- Instructors who are already Olune users (existing instructors on a studio's account) can create a Network profile with one click — data pre-fills from their existing profile
- Instructors not on Olune create a standalone Network account
- Studios use their existing Olune login

### Monetisation: None yet

The goal of Phase 1 is liquidity — enough instructors and enough studios using it actively that the marketplace has real utility.

**Phase 1 success criteria:**
- 50+ published instructor profiles (across local and international)
- 20+ studios actively searching
- 15+ inquiry threads initiated
- At least 3 confirmed engagements (tracked informally via follow-up)
- NPS from both sides ≥40

---

## Phase 2 — Booking & Payments (Months 6–10)

**Objective:** Formalise the booking flow with contracts, deposits, and payment processing through the platform.

### Features

**Booking flow:**
- Studio sends a formal booking offer (dates, location, rate, terms)
- Instructor accepts → booking created
- Platform-generated simple contract (customisable template)
- Deposit collected at booking (25–50% of agreed fee, held by platform)
- Balance due 7 days before engagement start
- Automatic release to instructor 48 hours after engagement end (unless dispute raised)
- Cancellation policy enforced automatically (configurable by instructor: flexible / moderate / strict)

**Payment infrastructure:**
- Stripe Connect (instructor onboards as a Stripe Express account)
- Platform fee deducted at payout (not upfront)
- Multi-currency support (NZD, AUD, GBP, USD) — aligns with Olune's international-first positioning

**Reviews:**
- Both sides prompted to leave a review 48 hours after engagement ends
- Reviews visible on instructor profile and on studio's Network activity page

**Verified credentials badge:**
- Instructors can submit credential documentation (RAD certificate, training transcripts, etc.)
- Olune team manually verifies and applies badge
- Priced at NZD $99/year

### Monetisation

| Revenue stream | Rate | Notes |
|---|---|---|
| Platform fee on bookings | 10% of agreed engagement fee | Deducted at payout to instructor |
| Verified credentials badge | NZD $99/year | Instructor-paid |
| Featured placement | NZD $29/month | Instructor-paid, appears at top of relevant searches |

**Phase 2 success criteria:**
- 30+ bookings processed through the platform in the first 3 months
- Zero payment disputes unresolved beyond 7 days
- Platform fee MRR: NZD $2,000+ (implies ~NZD $20K/month in booking value)
- Repeat usage: >40% of studios make a second booking within 6 months

---

## Phase 3 — International Premium (Months 10–16)

**Objective:** Build the tools that make international engagements easy to execute — and charge for them.

### Features

**For studios booking international guest teachers:**
- Contract template generator (customisable, covers key international clauses: IP, exclusivity, accommodation responsibilities, cancellation)
- Visa support letter generator (pre-filled from booking and studio details)
- Travel brief template (what to include for an international teacher: studio address, accommodation, schedule, emergency contacts)
- International engagement checklist (work authorisation confirmed, contract signed, deposit paid, travel details shared, accommodation confirmed)

**For instructors:**
- "International profile" tier — extended profile fields for touring teachers: international rates, preferred travel regions, portfolio PDF download
- Tour planning calendar — mark availability by country/region across a season
- Aggregate inquiry dashboard — see all open inquiries across studios in one view

**Platform:**
- Currency conversion display (show rates in instructor's home currency and studio's home currency simultaneously)
- Time zone-aware calendar and scheduling
- Multilingual profile support (profile displayed in studio's language — Phase 3 stretch)

### Monetisation additions

| Revenue stream | Rate | Notes |
|---|---|---|
| International Booking Package | NZD $149/booking | Studio-paid — unlocks contract generator, visa letter, travel brief, checklist |
| International Instructor Profile | NZD $199/year | Elevated profile tier for touring teachers |
| Pro/Enterprise Olune plans | Included | International tools bundled for top-tier studio subscribers |

**Phase 3 success criteria:**
- 10+ international bookings processed (cross-border, travel required)
- International Booking Package adopted by >60% of cross-border bookings
- Instructor touring profiles: 20+ actively maintained
- MRR from Network (combined phases): NZD $8,000–$15,000

---

## Phase 4 — Community & Scale (Month 16+)

**Objective:** Olune Network becomes the professional home for performing arts educators globally — not just a transaction platform, but a community.

### Features

**Community layer:**
- Open calls board — studios post "seeking guest teacher" calls that instructors can respond to (reverses the search direction)
- Summer school faculty calls — dedicated section for studios running intensives who want to recruit multiple guest teachers at once
- Professional development listings — workshops, courses, and certifications that instructors can promote
- Community forum — discipline-specific discussion threads (pedagogy, syllabus updates, career questions)

**Reputation & credentialing:**
- Olune Verified Master Teacher badge — rigorous, requires multiple verified reviews, credential check, and a teaching video assessment panel (Tasman's network as initial assessors)
- Years on platform + engagement count displayed
- Studio trust score (studios rated by instructors too — quality studios attract quality teachers)

**Data & matching:**
- AI-assisted matching — "You've booked RAD-certified contemporary teachers for your July intensive three years running — here are 5 instructors available this July who match your history"
- Trend alerts — "3 studios in your region are all searching for jazz teachers in November. List your availability now."

**Network effects at scale:**
- Every new instructor profile makes the platform more useful for studios
- Every new studio booking makes Network a better income source for instructors
- The flywheel compounds: more bookings → more reviews → better search quality → more bookings

**Phase 4 success criteria:**
- 500+ published instructor profiles
- 100+ studios actively using Network
- 200+ bookings/year processed through the platform
- Network MRR: NZD $30,000+ (becoming a meaningful standalone revenue stream)
- Organic instructor sign-ups (instructors finding Network independently, not just via Olune referral)

---

## Go-To-Market Strategy

### Phase 0–1: Personal network seeding

Tasman reaches out directly to the first 20–30 instructors. This is not a marketing campaign — it's a series of personal conversations. Each instructor recruited becomes an advocate.

Target first-wave instructor types:
- Vaganova Academy graduates (direct personal network)
- RAD examiners in NZ, AU, UK
- Former RNZB, Australian Ballet, or Royal Ballet School dancers now teaching
- Well-regarded independent teachers known in the NZ/AU performing arts circuit

### Phase 1–2: Studio-side activation

Every Olune studio receives an in-app announcement when Network launches. Frame it as: "Find a cover teacher in minutes. Bring world-class guest faculty to your studio."

Specific campaigns:
- "Summer school faculty" campaign in March–April (before NZ/AU winter summer schools)
- "Holiday programme" campaign in November (before December school holidays)
- "Never be caught short" cover teacher campaign targeting studio owners who've mentioned staffing challenges in support tickets

### Phase 2+: Instructor-led growth

Once booking and payment infrastructure is live, instructors have financial incentive to promote their own profiles. A touring teacher who books 2 international engagements per year through Network (averaging NZD $3,000 each) earns NZD $5,400 net after platform fee — and actively promotes the platform to studios they visit.

---

## Technical Architecture Notes

**Integration with Olune core:**
- Shared Supabase auth — existing users (studio owners, instructors) sign in with the same credentials
- Existing `Person` entity extended with `NetworkProfile` relation (1:0–1)
- Stripe Connect added alongside existing Stripe integration (not a replacement)
- New tables live in the same Supabase project under a `network_` prefix

**New schema tables required:**
```sql
network_profiles         -- instructor public profile
network_availability     -- calendar block-outs
network_engagements      -- confirmed bookings (replaces informal "inquiry confirmed")
network_inquiries        -- pre-booking inquiry threads
network_messages         -- messages within threads
network_reviews          -- post-engagement reviews (bidirectional)
network_credentials      -- submitted credential documents + verification status
```

**Routing:**
- `/network` — public-facing directory (no login required to browse)
- `/network/profile/[slug]` — individual instructor profile (public)
- `/network/search` — search with filters (public)
- `/network/dashboard` — authenticated instructor profile management
- `/network/studio` — authenticated studio inquiry management
- `/network/bookings` — booking management (Phase 2+)

**Email notifications (Resend):**
- Inquiry received (instructor)
- Inquiry responded to (studio)
- Booking confirmed (both)
- Deposit payment received (instructor)
- Engagement reminder 48 hours before (both)
- Review prompt 48 hours after (both)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supply-side cold start | Low | High | Tasman's personal network eliminates this for Phase 0 |
| Low booking conversion (people messaging off-platform) | Medium | High | Make on-platform booking clearly advantageous: payment protection, dispute resolution, contract tools |
| Fraud / misrepresentation of credentials | Medium | Medium | Verified badge for paying instructors; community reporting; manual review of Phase 1 profiles |
| ClassCover or competitor expands into performing arts | Low | Medium | Move fast to establish network effects; vertical depth is the moat |
| Studios use Network but don't upgrade their core plan | Medium | Low | Network benefits are bundled into Pro/Enterprise — creates upgrade incentive |
| International payment complexity (tax, withholding) | Medium | Medium | Self-reported tax status for Phase 2 MVP; proper tax handling in Phase 3 |

---

## Phased Roadmap Summary

| Phase | Timeline | Key Deliverable | Revenue |
|---|---|---|---|
| 0 — Seed | Month 0–2 | 20+ manual profiles, landing page, demand validation | $0 |
| 1 — MVP Directory | Month 2–5 | Searchable profiles, messaging, 50+ instructors | $0 |
| 2 — Booking & Payments | Month 6–10 | Stripe Connect, contracts, deposits, reviews | NZD $2K–$5K MRR |
| 3 — International Premium | Month 10–16 | Contract generator, visa tools, touring profiles | NZD $8K–$15K MRR |
| 4 — Community & Scale | Month 16+ | Open calls, AI matching, community layer | NZD $30K+ MRR |

---

## Open Decisions

1. **Brand name:** Olune Network (current working name) vs Olune Reserve vs a fully standalone brand. Recommendation: decide before Phase 1 launch — the domain and brand shape the GTM.
2. **Standalone domain vs subdomain:** `olunenetwork.com` or `network.olune.com`. Standalone has SEO and brand independence; subdomain is faster to ship and leverages Olune trust.
3. **Open access vs Olune-only:** Phase 0–1 should be open to any instructor and any studio (not Olune subscribers only) to maximise liquidity. Olune subscribers get premium features.
4. **Who verifies credentials:** Tasman manually in Phase 1–2. Needs a scalable process by Phase 3 (partner with RAD, ISTD, etc. for API-based verification long-term).
5. **First 10 instructors:** The actual list of names Tasman will personally contact. This is the most important action item before any build begins.

---

*Document version 1.0 — created June 2026. Next review: when Phase 0 seed results are in.*
