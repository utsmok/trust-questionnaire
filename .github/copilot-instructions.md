## Design Context

### Users

EIS-IS team at University of Twente — the same staff who use the EA copyright compliance tool. They are domain experts in information services, library systems, and academic integrity. They evaluate AI-based search tools systematically, working through structured questionnaires with 132+ fields across 10 sections.

**Job to be done:** Systematically evaluate AI search tools against the TRUST framework (Transparent, Reliable, User-centric, Secure, Traceable) to determine whether they meet academic standards for institutional recommendation. Speed and precision matter — these reviewers process dense evaluation criteria and need maximum information density with minimum visual noise.

### Brand Personality

**Three words:** Efficient, Explicit, Engineered

**Voice & Tone:**
- Direct and unadorned — no marketing fluff
- Technical precision over approachability
- Trusts user intelligence — never infantilizes
- State and inner workings are visible by default

**Emotional goals:** Reviewers should feel efficient and in control. Confidence comes from clarity and density of information, not from simplified UI. The tool should feel like a well-calibrated instrument, not a friendly assistant.

### Aesthetic Direction

**Visual philosophy:** Regimented functionalism. The opposite of minimalism — as complex as it needs to be.

**Core principles (aligned with US Graphics Company):**
- Emergent over prescribed aesthetics
- Expose state and inner workings
- Dense, not sparse
- Explicit is better than implicit
- Engineered for human vision and perception
- Performance is design
- Verbosity over opacity
- Ignore design trends — timeless and unfashionable
- Flat, not hierarchical
- Don't infantilize users

**Theme:** Light mode primary. UT Grey (#f0f1f2) canvas. Clean, flat backgrounds without gradients.

**References:** University of Twente brand colors adapted for function, not decoration. Shared design DNA with ea-cli-refactor tool — same team, same aesthetic language.

**Anti-references:**
- Consumer/social media aesthetics (playful, casual, trendy)
- "Comfortable" whitespace and generous padding
- Soft shadows and large rounded corners
- Minimalism that hides information
- Pill-shaped buttons and chips
- Gradient backgrounds and decorative blurs
- Onboarding flows and hand-holding

### Design Principles

1. **Density is a feature.** Maximize information per screen. Compact layouts with minimal padding. Trust users to handle complexity. The split-panel layout puts framework docs alongside the questionnaire — no tabbing.

2. **Color encodes state, not decoration.** UT colors have semantic meaning. The five TRUST principles are color-coded (Blue=Transparent, Green=Reliable, Purple=User-centric, Orange=Secure, Teal=Traceable). Red flags attention. Never use color for "branding splashes."

3. **Sharp and rational.** Zero or minimal border radius (0-2px). Visible grid lines and borders. Clear delineation over soft blending. No pill shapes — everything is block/square.

4. **Expose the machine.** Show field IDs, section codes, scoring values, and internal structure. Monospace for data/codes. Verbose labels over ambiguous icons.

5. **Keyboard-first efficiency.** Power users drive the interface. Every action should have a keyboard shortcut. Mouse is secondary.

### Typography

- **Body:** Inter — clean, readable, professional
- **Headings:** Arial Narrow — condensed, uppercase, tight tracking
- **Data/Codes:** JetBrains Mono — precise, monospace for field IDs and scoring data

### Color System

University of Twente palette mapped to semantic functions:

| Semantic | Color | Hex | Usage |
|----------|-------|-----|-------|
| Primary | UT Darkblue | #002c5f | Headers, primary buttons, key actions |
| Secondary | UT Blue | #007d9c | Links, focus rings, secondary actions |
| Destructive | UT Red | #c60c30 | Errors, attention, warning states |
| Success | UT Green | #4a8355 | Completed, done, positive states |
| Accent | UT Purple | #4f2d7f | Processing states |
| Action | UT Pink | #cf0072 | Primary CTA buttons, emphasis |
| Canvas | UT Grey | #f0f1f2 | Background canvas |

#### TRUST Principle Colors

| Principle | Variable | Hex | Usage |
|-----------|----------|-----|-------|
| Transparent (TR) | --tr | #2563EB | Transparency criteria sections |
| Reliable (RE) | --re | #16A34A | Reliability criteria sections |
| User-centric (UC) | --uc | #9333EA | User-centricity criteria sections |
| Secure (SE) | --se | #EA580C | Security criteria sections |
| Traceable (TC) | --tc | #0D9488 | Traceability criteria sections |

All colors have 10% tint variants for backgrounds and hover states.

### Component Patterns

**Section Cards:** Sharp corners (0px radius), left border color-coded, visible borders, compact padding, no soft shadows.

**Chips/Tags:** Square/block shapes (2px radius max), monospace font, status via color + 10% tint.

**Navigation Buttons:** Minimal rounding (2px), no shadows, no hover lift, Arial Narrow uppercase.

**Rating Scale:** Flat grid with visible borders, block-shaped option cards.

**Tables:** Visible grid lines (horizontal + vertical), compact padding, sticky headers.

### Accessibility

- Reduced motion support via `prefers-reduced-motion`
- Skip-to-content links
- Visible focus rings (UT Blue)
- 44x44px minimum touch targets on mobile
- High contrast text on all backgrounds
- Keyboard navigation for all interactive elements
