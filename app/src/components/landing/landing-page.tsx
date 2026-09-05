import Feather from "@expo/vector-icons/Feather";
import { Link, usePathname, useRouter } from "expo-router";
import Head from "expo-router/head";
import { type ComponentProps, useEffect, useState } from "react";
import { Image } from "react-native";

import { LEGAL_URLS } from "../../constants/legal";
import { IMAGES } from "../../constants/theme";
import "./landing.css";

type IconName = ComponentProps<typeof Feather>["name"];
const SIGNUP = "/signup?role=BUSINESS_OWNER" as const;
const TITLE = "RouteFloww | Multi-stop route planning and driver dispatch";
const DESCRIPTION =
  "Replace manual delivery planning with one organised workflow. Create and optimise multi-stop routes, assign drivers and follow delivery progress with RouteFloww.";
const steps: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "map-pin",
    title: "Add your stops",
    text: "Search for addresses or import a delivery manifest.",
  },
  {
    icon: "shuffle",
    title: "Shape your route",
    text: "Optimise the sequence, then adjust it to suit the day.",
  },
  {
    icon: "users",
    title: "Assign a driver",
    text: "Give each route an owner and a clear list of stops.",
  },
  {
    icon: "check-circle",
    title: "Keep work moving",
    text: "Drivers record outcomes. You follow route progress.",
  },
];
const faqs = [
  [
    "Who is RouteFloww designed for?",
    "RouteFloww is built for business owners, dispatchers and operations managers running local or multi-stop deliveries, with a connected route experience for their drivers.",
  ],
  [
    "Can I add multiple stops and change their order?",
    "Yes. Add delivery addresses to a route, optimise the sequence or manually reorder stops in the route planner. Route editing is available during planning; completed routes retain their delivery record.",
  ],
  [
    "How do drivers receive their routes?",
    "Dispatchers assign a route to a driver in their team. The driver signs in with their fleet access details, sees their assigned routes, and can accept and start the work.",
  ],
  [
    "What can I see as deliveries are completed?",
    "The operations dashboard shows route status and stop progress. Drivers record delivered or unsuccessful stops, and you can review route details and delivery history.",
  ],
  [
    "Can I import stops from a spreadsheet?",
    "Yes. The route planner supports CSV and Excel delivery manifests, as well as individual address entry. You can review imported stops before planning the route.",
  ],
  [
    "Which devices can my team use?",
    "The web workspace works in a browser on desktop, tablet and mobile. Drivers can also use the RouteFloww Android app, available through Google Play.",
  ],
];

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  return (
    <span className="rf-icon" aria-hidden="true" style={{ fontSize: size }}>
      {String.fromCodePoint(Number(Feather.glyphMap[name]))}
    </span>
  );
}

// Expo's asChild supplies onPress; DOM anchors need onClick instead.
function WebAnchor({
  onPress,
  onClick,
  ...props
}: ComponentProps<"a"> & { onPress?: ComponentProps<"a">["onClick"] }) {
  return <a {...props} onClick={onClick ?? onPress} />;
}

function Brand() {
  return (
    <Link href="/" asChild>
      <WebAnchor className="rf-brand" aria-label="RouteFloww home">
        <Image
          source={IMAGES.LOGO}
          style={{ width: 36, height: 36 }}
          accessibilityIgnoresInvertColors
        />
        <span>
          Route<span>Floww</span>
        </span>
      </WebAnchor>
    </Link>
  );
}

function StartLink({
  children = "Start planning routes",
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={SIGNUP} asChild>
      <WebAnchor className={`rf-button ${className}`}>
        {children}
        <Icon name="arrow-right" size={17} />
      </WebAnchor>
    </Link>
  );
}

// Illustrative geometry, not a live map. The numbered stops and statuses reflect
// the route planner and operations dashboard; no customer data is requested.
function RouteMap({ completed = 0 }: { completed?: number }) {
  return (
    <svg
      className="rf-map"
      viewBox="0 0 560 360"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustrative delivery route connecting a depot and six numbered stops"
    >
      <rect width="560" height="360" fill="#edf1ed" />
      <g fill="#e3e8e3" stroke="#dce3dc" strokeWidth="1">
        <path d="M12 12H115V66H12zM137 12h97v54h-97zM260 12h125v54H260zM410 12h133v54H410zM12 89h103v76H12zM137 89h97v76h-97zM260 89h72v76h-72zM355 89h89v76h-89zM470 89h73v76h-73zM12 190h103v72H12zM137 190h97v72h-97zM260 190h72v72h-72zM355 190h89v72h-89zM470 190h73v72h-73zM12 287h103v60H12zM137 287h97v60h-97zM260 287h72v60h-72zM355 287h89v60h-89zM470 287h73v60h-73z" />
      </g>
      <path
        d="M-20 318C68 292 77 206 169 215S277 320 360 294 468 182 580 213"
        fill="none"
        stroke="#c3dfe6"
        strokeWidth="28"
      />
      <path
        d="M-10 77H570M-10 178H570M-10 274H570M126-10V380M247-10V380M344-10V380M458-10V380"
        fill="none"
        stroke="#fff"
        strokeWidth="11"
      />
      <path
        d="M-30 135L589 16M18 379L507-24"
        fill="none"
        stroke="#d9dfd7"
        strokeWidth="17"
      />
      <path
        d="M-30 135L589 16M18 379L507-24"
        fill="none"
        stroke="#fff"
        strokeWidth="12"
      />
      <path
        d="M369 16l49 5 9 37-51 6zM18 192h83v46l-41 18-42-9zM365 193h66v56h-66z"
        fill="#cee0c8"
      />
      <g
        fill="#7c8b82"
        fontSize="9"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1.5"
      >
        <text x="20" y="45">
          NORTH QUARTER
        </text>
        <text x="370" y="330">
          RIVERSIDE
        </text>
        <text x="265" y="126">
          CENTRAL
        </text>
        <text x="368" y="220" fontSize="7">
          GARDENS
        </text>
      </g>
      <path
        d="M126 275V178H247V77H458V178H344V274H458"
        fill="none"
        stroke="white"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <path
        className="rf-route-path"
        d="M126 275V178H247V77H458V178H344V274H458"
        fill="none"
        stroke={completed === 6 ? "#198065" : "#2f6bed"}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {[
        [126, 178],
        [247, 112],
        [361, 77],
        [458, 153],
        [344, 221],
        [458, 274],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="14"
            fill={i < completed ? "#198065" : "#2f6bed"}
            stroke="white"
            strokeWidth="3"
          />
          <text
            x={x}
            y={y + 4}
            textAnchor="middle"
            fill="white"
            fontFamily="system-ui, sans-serif"
            fontSize="11"
            fontWeight="700"
          >
            {i < completed ? "✓" : i + 1}
          </text>
        </g>
      ))}
      <rect
        x="112"
        y="262"
        width="28"
        height="28"
        rx="7"
        fill="#172d43"
        stroke="white"
        strokeWidth="3"
      />
      <path
        d="m120 275 6-5 6 5v7h-12z"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      <g transform="translate(17 322)">
        <rect width="123" height="23" rx="4" fill="white" />
        <circle cx="12" cy="11" r="3" fill="#2f6bed" />
        <text
          x="23"
          y="15"
          fontSize="9"
          fill="#536273"
          fontFamily="system-ui, sans-serif"
        >
          Illustrative route map
        </text>
      </g>
    </svg>
  );
}

function DispatchPreview() {
  const [stage, setStage] = useState(1);
  const completed = [0, 3, 6][stage];
  return (
    <figure className="rf-preview">
      <div className="rf-window-bar">
        <span className="rf-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>
          <Icon name="lock" size={10} /> RouteFloww workspace
        </span>
        <Icon name="more-horizontal" size={15} />
      </div>
      <div className="rf-workspace">
        <aside className="rf-preview-rail" aria-hidden="true">
          <Icon name="navigation" size={22} />
          <span className="rf-rail-active">
            <Icon name="grid" />
          </span>
          <Icon name="map" />
          <Icon name="users" />
          <Icon name="clock" />
          <span className="rf-rail-bottom">
            <Icon name="settings" />
          </span>
        </aside>
        <div className="rf-workspace-main">
          <div className="rf-workspace-heading">
            <div>
              <span className="rf-micro">YOUR OPERATIONS</span>
              <h3>Dispatch overview</h3>
            </div>
            <span className="rf-today">
              <Icon name="calendar" size={12} /> Today
            </span>
          </div>
          <div
            className="rf-stage-switch"
            role="group"
            aria-label="Explore example route stages"
          >
            {["Planned", "In progress", "Completed"].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={stage === i}
                onClick={() => setStage(i)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="rf-preview-map">
            <RouteMap completed={completed} />
            <div className="rf-map-route-label">
              <span className="rf-blue-dot" /> Central delivery route{" "}
              <span>6 stops</span>
            </div>
          </div>
          <div className="rf-route-summary" aria-live="polite">
            <div className="rf-avatar">JD</div>
            <div>
              <strong>Jamie D.</strong>
              <span>
                {stage === 0
                  ? "Assigned to this route"
                  : stage === 1
                    ? "3 of 6 stops completed"
                    : "6 of 6 stops completed"}
              </span>
            </div>
            <span
              className={`rf-status ${stage === 2 ? "rf-status-green" : ""}`}
            >
              {["Assigned", "In progress", "Completed"][stage]}
            </span>
          </div>
          <div className="rf-mini-progress">
            <span style={{ width: `${(completed / 6) * 100}%` }} />
          </div>
        </div>
      </div>
      <figcaption>
        <span className="rf-blue-dot" /> Product workflow preview{" "}
        <span>Example data · select a stage to explore</span>
      </figcaption>
    </figure>
  );
}

function PlannerPreview() {
  return (
    <figure className="rf-planner">
      <div className="rf-panel-top">
        <span>
          <Icon name="map" /> Route planner
        </span>
        <span className="rf-micro">EXAMPLE ROUTE</span>
      </div>
      <div className="rf-planner-body">
        <div className="rf-planner-title">
          <div>
            <span className="rf-micro">MORNING DELIVERIES</span>
            <h3>A clear plan for every stop.</h3>
          </div>
          <span className="rf-status rf-status-green">Optimised</span>
        </div>
        <div className="rf-search-preview">
          <Icon name="search" size={16} /> Add a delivery address
          <span>
            <Icon name="plus" size={16} />
          </span>
        </div>
        <ol className="rf-stop-list">
          {[
            ["Depot", "Start and finish", "home"],
            ["24 Market Street", "Delivery stop", "map-pin"],
            ["8 Station Road", "Delivery stop", "map-pin"],
            ["16 Riverside Lane", "Delivery stop", "map-pin"],
          ].map(([title, subtitle, icon], i) => (
            <li key={title}>
              <span className={`rf-stop-number ${i === 0 ? "rf-depot" : ""}`}>
                {i === 0 ? <Icon name={icon as IconName} size={14} /> : i}
              </span>
              <div>
                <strong>{title}</strong>
                <span>{subtitle}</span>
              </div>
              <Icon name="menu" size={15} />
            </li>
          ))}
        </ol>
        <div className="rf-planner-foot">
          <Icon name="check-circle" size={16} />
          <span>Stop sequence organised. Ready to assign.</span>
        </div>
      </div>
      <figcaption>Route planning preview · example addresses</figcaption>
    </figure>
  );
}

function DriverPreview() {
  return (
    <figure className="rf-handoff">
      <div className="rf-assignment-card">
        <span className="rf-micro">DISPATCHER WORKSPACE</span>
        <div>
          <span className="rf-square-icon">
            <Icon name="send" />
          </span>
          <h3>Central delivery route</h3>
        </div>
        <div className="rf-assignment-person">
          <span className="rf-avatar">JD</span>
          <span>
            <strong>Jamie D.</strong>
            <small>Assigned driver</small>
          </span>
          <Icon name="check-circle" />
        </div>
        <p>
          <Icon name="check" size={15} /> Route assigned
        </p>
      </div>
      <div className="rf-handoff-connector" aria-hidden="true">
        <span />
        <Icon name="arrow-down" />
      </div>
      <div className="rf-phone">
        <div className="rf-phone-speaker" />
        <div className="rf-phone-header">
          <span>My route</span>
          <Icon name="more-horizontal" />
        </div>
        <h3>Central delivery route</h3>
        <div className="rf-phone-progress">
          <span>3 of 6 stops completed</span>
          <strong>50%</strong>
        </div>
        <div className="rf-mini-progress">
          <span style={{ width: "50%" }} />
        </div>
        <div className="rf-phone-map">
          <RouteMap completed={3} />
        </div>
        <div className="rf-next-stop">
          <span className="rf-stop-number">4</span>
          <div>
            <span className="rf-micro">NEXT STOP</span>
            <strong>8 Station Road</strong>
            <small>Leave with reception</small>
          </div>
        </div>
        <div className="rf-delivered-preview">
          <Icon name="check-circle" size={17} /> Record delivery outcome
        </div>
      </div>
      <figcaption>
        Connected dispatcher and driver views · example data
      </figcaption>
    </figure>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname === "/landing") router.replace("/");
  }, [pathname, router]);
  return (
    <div className="rf-landing">
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href="https://routefloww.com/" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://routefloww.com/" />
        <meta property="og:site_name" content="RouteFloww" />
        <meta name="twitter:card" content="summary" />
        <meta name="theme-color" content="#f7f9fc" />
      </Head>
      <a className="rf-skip" href="#main-content">
        Skip to content
      </a>
      <header className="rf-header">
        <div className="rf-container rf-header-inner">
          <Brand />
          <nav className="rf-desktop-nav" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#for-your-team">For your team</a>
          </nav>
          <div className="rf-header-actions">
            <Link href="/login" asChild>
              <WebAnchor className="rf-sign-in">Sign in</WebAnchor>
            </Link>
            <StartLink className="rf-header-cta">Get started</StartLink>
            <button
              className="rf-menu-toggle"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="rf-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "x" : "menu"} size={23} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="rf-mobile-nav"
            className="rf-mobile-nav"
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                document
                  .querySelector<HTMLButtonElement>(".rf-menu-toggle")
                  ?.focus();
              }
            }}
          >
            <a href="#product" onClick={() => setMenuOpen(false)}>
              Product
              <Icon name="arrow-right" />
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
              <Icon name="arrow-right" />
            </a>
            <a href="#for-your-team" onClick={() => setMenuOpen(false)}>
              For your team
              <Icon name="arrow-right" />
            </a>
            <StartLink>Get started</StartLink>
          </nav>
        )}
      </header>
      <main id="main-content">
        <section className="rf-hero">
          <div className="rf-container rf-hero-grid">
            <div className="rf-hero-copy">
              <p className="rf-eyebrow">
                <span className="rf-blue-dot" /> ROUTE PLANNING & DISPATCH
              </p>
              <h1>
                Plan smarter routes.
                <br />
                <span>
                  Dispatch with
                  <br className="rf-desktop-break" /> confidence.
                </span>
              </h1>
              <p className="rf-hero-description">
                Bring your delivery day together. Plan multi-stop routes, assign
                drivers and follow every stop from one organised workspace.
              </p>
              <div className="rf-hero-actions">
                <StartLink />
                <a className="rf-text-link" href="#how-it-works">
                  See how it works
                  <Icon name="arrow-down" size={16} />
                </a>
              </div>
              <p className="rf-hero-note">
                <Icon name="check-circle" size={15} /> Built for the people
                behind every delivery.
              </p>
            </div>
            <DispatchPreview />
          </div>
          <div className="rf-container rf-audience">
            <span>MADE FOR YOUR DELIVERY DAY</span>
            <p>Local delivery teams</p>
            <i />
            <p>Multi-stop operations</p>
            <i />
            <p>Businesses with their own drivers</p>
          </div>
        </section>

        <section className="rf-workflow rf-section" id="how-it-works">
          <div className="rf-container">
            <div className="rf-section-heading">
              <div>
                <p className="rf-eyebrow">FROM FIRST STOP TO FINAL DELIVERY</p>
                <h2>
                  One workflow.
                  <br />
                  Fewer loose ends.
                </h2>
              </div>
              <p>
                Stops in a spreadsheet. Routes in a map. Driver updates in
                messages. Bring the work together, so the next step is always
                clear.
              </p>
            </div>
            <ol className="rf-steps">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <div className="rf-step-top">
                    <span className="rf-step-icon">
                      <Icon name={step.icon} size={23} />
                    </span>
                    <span className="rf-step-line" />
                    <span className="rf-step-index">0{i + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="rf-section rf-product" id="product">
          <div className="rf-container rf-feature-grid">
            <PlannerPreview />
            <div className="rf-feature-copy">
              <p className="rf-eyebrow">01 / PLAN WITH CLARITY</p>
              <h2>
                A list of addresses.
                <br />A route that makes sense.
              </h2>
              <p>
                Get delivery stops out of scattered files and into a workable
                plan. Build your route, optimise the order and make the final
                adjustments yourself.
              </p>
              <ul className="rf-check-list">
                <li>
                  <Icon name="check" /> Add addresses or import CSV and Excel
                  manifests
                </li>
                <li>
                  <Icon name="check" /> Optimise the sequence of multiple stops
                </li>
                <li>
                  <Icon name="check" /> Reorder stops and edit the route before
                  dispatch
                </li>
              </ul>
              <StartLink className="rf-link-button">
                Build your first route
              </StartLink>
            </div>
          </div>
        </section>

        <section className="rf-team rf-section" id="for-your-team">
          <div className="rf-container rf-feature-grid">
            <div className="rf-feature-copy">
              <p className="rf-eyebrow">02 / HAND OVER WITH CONFIDENCE</p>
              <h2>
                Your plan.
                <br />
                In the right hands.
              </h2>
              <p>
                A good delivery day needs a clear handover. Assign work in your
                dispatch workspace, then give drivers the route details they
                need to get going.
              </p>
              <div className="rf-team-points">
                <div>
                  <Icon name="monitor" size={23} />
                  <div>
                    <h3>For the dispatcher</h3>
                    <p>
                      Organise drivers, assign routes and see how delivery work
                      is progressing.
                    </p>
                  </div>
                </div>
                <div>
                  <Icon name="smartphone" size={23} />
                  <div>
                    <h3>For the driver</h3>
                    <p>
                      Access assigned routes, start the journey and record each
                      delivery outcome.
                    </p>
                  </div>
                </div>
              </div>
              <a className="rf-text-link" href={LEGAL_URLS.PLAY_STORE_APP}>
                Explore the Android driver app
                <Icon name="arrow-up-right" size={17} />
              </a>
            </div>
            <DriverPreview />
          </div>
        </section>

        <section className="rf-section rf-visibility">
          <div className="rf-container">
            <div className="rf-section-heading">
              <div>
                <p className="rf-eyebrow">03 / KEEP THE DAY IN VIEW</p>
                <h2>Know where the work stands.</h2>
              </div>
              <p>
                Follow route status, review stop outcomes and return to delivery
                history. A shared record keeps the next conversation focused.
              </p>
            </div>
            <div className="rf-history">
              <div className="rf-panel-top">
                <span>
                  <Icon name="layers" /> Delivery overview
                </span>
                <span className="rf-micro">EXAMPLE DATA</span>
              </div>
              <div className="rf-history-row rf-history-labels">
                <span>ROUTE</span>
                <span>DRIVER</span>
                <span>STOP PROGRESS</span>
                <span>STATUS</span>
              </div>
              {[
                ["Central delivery route", "Jamie D.", 3, 6, "In progress"],
                ["North delivery route", "Alex M.", 0, 8, "Assigned"],
                ["Riverside delivery route", "Sam R.", 5, 5, "Completed"],
              ].map(([route, driver, done, total, status]) => (
                <div className="rf-history-row" key={route}>
                  <strong>
                    <Icon name="map-pin" size={16} />
                    {route}
                  </strong>
                  <span>{driver}</span>
                  <div className="rf-table-progress">
                    <span>
                      {done} / {total} stops
                    </span>
                    <div className="rf-mini-progress">
                      <span
                        style={{
                          width: `${(Number(done) / Number(total)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`rf-status ${status === "Completed" ? "rf-status-green" : status === "Assigned" ? "rf-status-grey" : ""}`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
            <div className="rf-benefits">
              <p>
                <Icon name="eye" /> Clear route status
              </p>
              <p>
                <Icon name="clipboard" /> Recorded delivery outcomes
              </p>
              <p>
                <Icon name="clock" /> Route history to refer back to
              </p>
            </div>
          </div>
        </section>

        <section className="rf-faq rf-section" id="questions">
          <div className="rf-container rf-faq-grid">
            <div>
              <p className="rf-eyebrow">A FEW PRACTICAL DETAILS</p>
              <h2>
                Before your <br />
                first route.
              </h2>
              <p>Get to know the everyday workflow.</p>
            </div>
            <div className="rf-faq-list">
              {faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span className="rf-faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="rf-final">
          <div className="rf-container rf-final-inner">
            <div>
              <p className="rf-eyebrow">
                A MORE ORGANISED DELIVERY DAY STARTS HERE
              </p>
              <h2>
                Give your next route
                <br />a clearer direction.
              </h2>
              <p>
                One place to plan the stops, assign the work and follow the day.
              </p>
            </div>
            <StartLink />
          </div>
        </section>
      </main>
      <footer className="rf-footer">
        <div className="rf-container">
          <div className="rf-footer-top">
            <div>
              <Brand />
              <p>Every stop. One connected workflow.</p>
            </div>
            <nav aria-label="Footer navigation">
              <a href="#product">Product</a>
              <a href="#how-it-works">How it works</a>
              <a href="#questions">FAQs</a>
              <Link href="/login" asChild>
                <WebAnchor>Sign in</WebAnchor>
              </Link>
            </nav>
          </div>
          <div className="rf-footer-bottom">
            <span>© {new Date().getFullYear()} RouteFloww</span>
            <div>
              <a href={LEGAL_URLS.PRIVACY_POLICY}>Privacy policy</a>
              <a href={LEGAL_URLS.ACCOUNT_DELETION}>Account deletion</a>
              <a href={LEGAL_URLS.PLAY_STORE_APP}>
                Android app
                <Icon name="arrow-up-right" size={12} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
