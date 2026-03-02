# calc-eos — Equation of State Web App

## Project Overview

A web application that lets users apply thermodynamic equations of state (EOS)
to estimate chemical properties. Targeted at engineers, researchers, and students
working with real-world chemical process problems.

Public-facing, no authentication. Runs primarily client-side.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | Vanilla JavaScript (ES modules) | Simple, no framework overhead |
| Dev tooling | Vite | Dev server, hot reload, production bundling |
| Charting | Plotly.js or Chart.js | Interactive scientific plots (TBD) |
| Compound data | JSON file | Ships with the app, no database needed |
| Backend | TBD | May add a server later to serve compound parameters on demand |
| Deployment | Static site (Netlify/Vercel/GitHub Pages) | Free, simple |

---

## Phase 1: Ideal Gas + Scaffold

Get an end-to-end working app with the simplest EOS.

### EOS engine
- Implement Ideal Gas Law (PV = nRT) as a pure JS module
- Solve for any one of P, V, T, or n given the other three
- Clean module interface so additional EOS plug in easily later

### UI
- Single-page calculator
- Input fields for known variables (P, T, V, n)
- Select which variable to solve for
- Display result with units
- Basic styling (clean, functional)

### Compound data
- Start with a small set (~10-20) of common gases
- JSON file with name, formula, molecular weight
- Searchable dropdown to auto-fill molecular weight

### Project setup
- Vite vanilla JS template
- Folder structure established
- Dev server running

---

## Phase 2: Cubic EOS

Add real-world equations of state that need critical properties.

| EOS | Use Case |
|-----|----------|
| Van der Waals | Teaching, quick estimates |
| Peng-Robinson | Industry standard, wide applicability |
| Soave-Redlich-Kwong (SRK) | Hydrocarbon systems |

### What this adds
- Cubic equation solver (find Z roots)
- Compound database expanded with critical properties (Tc, Pc, acentric factor)
- Compressibility factor (Z) display
- EOS selector in the UI
- Comparison view: run same inputs across multiple EOS

---

## Phase 3: Advanced Properties & Visualization

- **Fugacity coefficient** — phase equilibrium
- **Enthalpy & entropy departures** — energy balances
- **VLE** — bubble/dew point for pure components
- **Phase diagrams** — interactive P-V isotherms, P-T diagrams
- Expand compound database to ~50-100 compounds

---

## Phase 4: Polish & Deploy

- Unit conversion support (SI + imperial)
- Input validation and clear error messages
- Responsive design
- Help text explaining each EOS and its assumptions
- Deploy to static hosting
- Optional: add a backend (Node/Express) if we decide to serve
  compound data or hide parameters server-side

---

## Decisions Made

- **Vanilla JS + Vite** — no framework, Vite for dev ergonomics
- **Client-side calculations** — no server needed for core functionality
- **Start simple** — Ideal Gas first, build up to cubic EOS
- **Public tool** — no authentication
- **Custom implementation** — build EOS from scratch, not wrapping a library

## Open Questions (remaining)

1. **Mixtures** — pure components first, multi-component later?
2. **Units** — SI only to start, add imperial later?
3. **Server** — may add later to serve compound parameters; decision deferred
4. **Charting library** — Plotly.js vs Chart.js (decide in Phase 3)

---

## Project Structure

```
calc-eos/
├── CLAUDE.md
├── README.md
├── index.html                # entry point
├── vite.config.js
├── package.json
├── src/
│   ├── main.js               # app initialization
│   ├── eos/                   # EOS implementations (pure functions)
│   │   ├── ideal-gas.js
│   │   ├── van-der-waals.js   # Phase 2
│   │   ├── peng-robinson.js   # Phase 2
│   │   └── srk.js             # Phase 2
│   ├── compounds/
│   │   └── data.json          # chemical database
│   ├── ui/                    # DOM manipulation, rendering
│   │   ├── calculator.js
│   │   └── compound-picker.js
│   ├── utils/
│   │   ├── solver.js          # cubic solver, root finding
│   │   └── units.js           # unit conversion
│   └── style.css
└── tests/                     # validation against known values
```
