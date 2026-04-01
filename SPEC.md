# Rylem EOS — Ninety.io Clone Spec

## Overview
Build a self-hosted EOS (Entrepreneurial Operating System) management tool to replace Ninety.io. Single-page web app, GitHub Pages deployable (static HTML/CSS/JS + JSON data files). Zero monthly cost.

## Tech Stack
- Pure HTML/CSS/JavaScript (no frameworks, no build step)
- localStorage for persistence (MVP), with JSON import/export
- Single index.html entry point
- Dark, modern UI (think Notion meets Linear — clean, fast, no clutter)
- Fully responsive (desktop-first, but usable on tablet)

## Modules to Build (matching Ninety.io exactly)

### 1. Scorecard
- Weekly measurables table with configurable goals
- 13-week trailing view (configurable: 6, 13, 26 weeks)
- Color coding: green (on/above goal), red (below goal), blank (no data)
- Each measurable has: Title, Owner, Goal (>=, <=, or = target), weekly values
- Averages and totals auto-calculated
- Click cell to enter/edit value

**Rylem's current measurables (preload these):**
| Measurable | Goal | Owner |
|---|---|---|
| NonVMS Placement | >= 66 | Mike Dades |
| VMS Placement | >= 70 | Mike Dades |
| New Jobs - NonVMS | >= 6 | Mike Dades |
| GDM Contractors | >= 20 | Mike Dades |

### 2. Rocks (Quarterly Goals)
- Grouped by person
- Each rock: Title, Owner, Status (On-track / Off-track / Complete), Due Date, Milestones (sub-items with checkboxes)
- Company Rocks section at top
- Filter by: Team, Owner, Status
- Archive tab for completed rocks

**Preload Rylem's rocks:**
- **Jon Bobillo:** Backfill Liz (Off-track, May 31), Dashboard Completion (Complete, Mar 31), Sales Training Completion (On-track, Mar 31)
- **Lanni Aguilan:** Monthly recon process (Complete, Mar 31), Train Emily month-end (On-track, Jun 30), HR/Acctg Training on Website (Complete, Mar 31), Sales Tax Process Review (On-track, Apr 30), Get 1 Review Q1 2026 (On-track, Mar 31)
- **Liza Valencia-Vilog:** $85 margin add (Complete, Mar 31), Personality assessment for hires (Complete, Mar 31), Interview 15 tech recruiters (Complete, Mar 31), Recruiting Process Check Point (Complete, Mar 31), $200 margin add (On-track, Jun 28), Monthly Recruiting Process Check Point (On-track, Jun 28), Hire 1 Technical Recruiter (On-track, Jun 28)
- **Mike Dades:** Redesign Ideal BDM Profile (On-track, Mar 31), Redesign day 1-90 BDM onboarding (Complete, Mar 20), Redesign reference check questions (On-track, Mar 31)

### 3. To-Dos
- Team To-Dos: visible to whole team
- Personal To-Dos: private
- Each to-do: Title, Owner, Due Date, Complete (checkbox)
- Sort by due date
- Archive completed

**Preload Rylem's to-dos:**
- Mike - create shipping labels (Apr 13, Jon Bobillo)
- Liza/Lanni - Schedule AI Dashboard discussion with Mike (Apr 6, Lanni Aguilan)
- Lanni - inform Mary not to include payroll service in burden percentage (Apr 6, Liza Valencia-Vilog)
- Mike - send training links to Lanni, Liza and Jon, send invite to go over (Apr 6, Liza Valencia-Vilog)
- Jon and Lanni to plan and communicate preemptive measures for the energy crisis (Apr 6, Liza Valencia-Vilog)

### 4. Issues (IDS — Identify, Discuss, Solve)
- Short-term and Long-term tabs
- Each issue: Title, Owner, Priority (1-3), Created Date, Notes
- Drag to reorder / prioritize
- "Solve" button moves to completed + creates a to-do if needed
- Archive completed

### 5. V/TO (Vision/Traction Organizer)
- Two tabs: Vision and Traction
- **Vision tab:** Core Values (list), Core Focus (purpose + niche), 10-Year Target, Marketing Strategy (target market, three uniques, proven process, guarantee)
- **Traction tab:** 3-Year Picture (revenue, profit, measurables, goals list), 1-Year Plan (revenue, profit, goals), Current Quarter Rocks summary
- Editable inline (click to edit any field)
- Print/export to PDF

**Preload Rylem's V/TO:**
- Core Values: Character, Grit, Results (with descriptions)
- Core Focus: Transforming Businesses and Careers | Staffing and Recruiting
- 10-Year Target: $50 Million in revenue (Dec 31, 2034)
- Target Market: Tech, Finance, Marketing, Creative Hiring Managers, 50-5000 employees, No VMS, US (Seattle, NC, FL, TX)
- Three Uniques: Retention (0% unwanted attrition), Company Rating (highest-rated in WA), Close Rate (100% on exclusives)
- Proven Process: One-Pager
- Guarantee: FTE Yes, Contract Backfill, Global Delivery Yes
- 3-Year (Dec 31, 2027): $12M revenue, $600k profit, 80 contractors on billing, 25% GM, core processes documented, 3-4 producing BDMs

### 6. Accountability Chart
- Org chart visualization (tree layout)
- Each seat: Title, Person Name, Roles & Responsibilities (bullet list)
- Click to expand/edit
- Visual connectors between seats

**Preload Rylem's chart:**
- Visionary: Mike Dades (20 Ideas, Creativity, Big Relationships, Culture, R&D, More on Emotion)
- Integrator: Jon Bobillo (LMA, P&L, Remove Obstacles, Special Projects, Core Processes, More on Logic)
- Sales: Mike Dades (LMA, Sales/revenue goal, Selling, Marketing, Sales & Marketing Process)
- Operations: Jon Bobillo (LMA, Process Improvement, Tools/Process Mgmt, Special Projects, Internal Hiring, Employee Relations, Reporting)
- HR and Finance: Lanni Aguilan (LMA, AR/AP, Budgeting, Reporting, HR/Admin, IT, Office Management)
- Recruiting: Liza Valencia-Vilog

### 7. L10 Meeting Tool
- Timed agenda sections:
  - Segue/Check-in (5 min)
  - Scorecard Review (5 min)
  - Rock Review (5 min)
  - Customer/Employee Headlines (5 min)
  - To-Do Review (5 min)
  - IDS (Issues) (60 min)
  - Conclude (5 min)
- Built-in timer per section (counts down, flashes when done)
- Rate the meeting (1-10) at the end
- Auto-pulls Scorecard, Rocks, To-Dos, Issues into their sections
- Meeting history (date, rating, notes, issues solved)

## Navigation
- Left sidebar with icons for each module (like Ninety.io)
- Collapsible sidebar
- Top bar with team selector and user avatar

## Team Members (preload)
- Mike Dades (MD)
- Jon Bobillo (JB)
- Lanni Aguilan (LA)
- Liza Valencia-Vilog (LV)

## Data Model
All data stored in localStorage under key `rylem_eos`. Structure:
```json
{
  "team": { "name": "Leadership Team", "members": [...] },
  "vto": { "coreValues": [...], "coreFocus": {...}, ... },
  "scorecard": { "measurables": [...], "entries": {...} },
  "rocks": [...],
  "todos": [...],
  "issues": [...],
  "accountability": [...],
  "meetings": [...]
}
```

## Import/Export
- Settings page with "Export JSON" and "Import JSON" buttons
- Export downloads the full localStorage data as .json file
- Import reads .json file and replaces localStorage

## Design Guidelines
- Background: #0f0f0f (near-black)
- Cards/panels: #1a1a1a with subtle border #2a2a2a
- Primary accent: #6366f1 (indigo)
- Success: #22c55e
- Warning: #f59e0b
- Danger: #ef4444
- Text: #e5e5e5 (primary), #a3a3a3 (secondary)
- Font: Inter or system-ui
- Border radius: 8px on cards, 6px on buttons
- Subtle hover states on all interactive elements
- No shadows — use borders and background contrast

## File Structure
```
index.html          — main app shell + all modules
style.css           — all styles
app.js              — all logic, data management, rendering
data/seed.json      — initial data (Rylem's current Ninety.io data)
```

## CRITICAL
- This must work as a static site — no server, no API, no database
- All persistence via localStorage
- Must be deployable to GitHub Pages with zero config
- Preload ALL of Rylem's existing data from the spec above
- The app should feel snappy — no loading spinners, instant navigation between modules
