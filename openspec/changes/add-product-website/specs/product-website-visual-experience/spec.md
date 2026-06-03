## ADDED Requirements

### Requirement: Reference-inspired editorial visual style
The system SHALL apply an editorial product website style inspired by `design-system/website/1.jpg` through `5.jpg`.

#### Scenario: Visitor views a desktop layout
- **WHEN** a visitor views the site on a desktop viewport
- **THEN** the site uses a white canvas, generous spacing, large bold headings, muted body text, black primary buttons, and image-led sections that reflect the provided reference style.

#### Scenario: Product media is displayed
- **WHEN** the website displays major imagery
- **THEN** the imagery uses Tide X product screenshots, Tide X brand assets, approved concept screenshots, or product-relevant abstract visuals rather than unrelated lifestyle or nature images.

#### Scenario: Numbered sections are displayed
- **WHEN** the home page or feature sections present multiple product concepts
- **THEN** at least one section uses large muted numeric labels such as `01`, `02`, and `03` to echo the reference layouts.

### Requirement: Tide X brand adaptation
The system SHALL adapt the reference style to the Tide X brand without losing product trustworthiness.

#### Scenario: Primary call to action is shown
- **WHEN** the website displays a primary action such as download or view changelog
- **THEN** the action uses a high-contrast filled button with accessible text contrast and a stable hover/focus state.

#### Scenario: Tide X brand assets are used
- **WHEN** the header, footer, hero, or metadata surfaces show the product identity
- **THEN** they use the Tide X name and approved logo assets from the repository or website public assets.

#### Scenario: Product blue is used
- **WHEN** the site needs accent color for focus rings, links, badges, or screenshot highlights
- **THEN** it may use the Tide X primary blue `#2f54eb` without replacing the reference-inspired black-and-white editorial foundation.

### Requirement: Responsive website layouts
The system SHALL provide responsive page layouts that preserve readability and visual polish across common viewport widths.

#### Scenario: Visitor views the site on mobile
- **WHEN** the viewport is mobile width
- **THEN** large headings wrap cleanly, media stacks below or above text predictably, buttons remain tappable, and no horizontal scrolling is introduced.

#### Scenario: Visitor views the site on tablet
- **WHEN** the viewport is tablet width
- **THEN** feature and media grids reduce column count while preserving consistent gaps and stable image aspect ratios.

#### Scenario: Visitor views the site on wide desktop
- **WHEN** the viewport is wide desktop width
- **THEN** content stays within intentional max-width containers and does not stretch text lines beyond comfortable reading length.

### Requirement: Image grid and media treatment
The system SHALL use consistent media sizing, rounded corners, and loading behavior for website imagery.

#### Scenario: Media grid renders
- **WHEN** a media grid renders on the home page
- **THEN** images use consistent aspect ratios, visible dimensions, object-fit behavior, and spacing so layout does not shift as images load.

#### Scenario: Below-fold images render
- **WHEN** images appear below the initial viewport
- **THEN** they use lazy loading or equivalent Astro/static optimization where practical.

#### Scenario: Image is informational
- **WHEN** an image communicates product interface or release information
- **THEN** the image has descriptive alternative text.

### Requirement: Accessible static website experience
The system SHALL meet baseline accessibility expectations for a public static website.

#### Scenario: Keyboard user navigates the site
- **WHEN** a keyboard user tabs through links, buttons, and navigation
- **THEN** each interactive element exposes a visible focus state.

#### Scenario: Screen reader user navigates pages
- **WHEN** a screen reader user navigates a page
- **THEN** the page uses semantic landmarks, a single primary heading, meaningful section headings, and descriptive link text.

#### Scenario: User prefers reduced motion
- **WHEN** the visitor has reduced-motion preferences enabled
- **THEN** non-essential animation and transitions are disabled or minimized.

#### Scenario: Text contrast is evaluated
- **WHEN** text, links, buttons, and badges are displayed
- **THEN** foreground and background colors meet WCAG AA contrast expectations for normal body text and interactive controls.
