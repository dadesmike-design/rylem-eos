# Multi-Team Upgrade Spec

## Overview
Add a team switcher to the Rylem EOS app. When user selects a team from the dropdown, all 7 modules (Scorecard, Rocks, To-Dos, Issues, V/TO, Accountability Chart, L10 Meeting) swap to that team's data. V/TO and Accountability Chart remain shared/global (same for all teams).

## Team Switcher UI
- Dropdown at the top of the page (below the Rylem EOS header, above the module tabs)
- Shows current team name
- Options: All, Leadership Team, Sales, Sales and NonVMS, VMS, Appointment Setters, Back Office, EOS Training, Support Specialists
- "All" shows aggregated view (all rocks from all teams, all to-dos, etc.)
- Selecting a team filters Scorecard, Rocks, To-Dos, Issues to that team only
- V/TO and Accountability Chart are always the same (company-wide, not per-team)
- Store selected team in localStorage so it persists across refreshes

## Data Structure Change
Currently seed.json has a flat structure. Change to:
```json
{
  "teams": [
    {
      "id": "leadership",
      "name": "Leadership Team",
      "members": [...],
      "scorecard": {...},
      "rocks": [...],
      "todos": [...],
      "issues": [...]
    },
    {
      "id": "sales",
      "name": "Sales",
      "members": [...],
      ...
    }
    // ... all 8 teams
  ],
  "vto": { ... },  // shared across all teams
  "accountabilityChart": { ... },  // shared
  "l10": { ... }  // per-team (each team has own L10 config)
}
```

## Preloaded Team Data

### Leadership Team
Members: Mike Dades (MD), Jon Bobillo (JB), Lanni Aguilan (LA), Liza Valencia-Vilog (LV)
Scorecard: NonVMS Placement >=66, VMS Placement >=70, GDM Contractors >=20, New Jobs NonVMS >=6
Rocks:
- Mike: "Redesign Ideal BDM Profile" On-track Mar 31
- Mike: "Redesign day 1-90 BDM onboarding" Complete Mar 20
- Mike: "Redesign reference check questions (no red flags allowed)" On-track Mar 31
- Jon: "Backfill Liz" Off-track May 31
- Jon: "Dashboard Completion" Complete Mar 31
- Jon: "Sales Training Completion" On-track Mar 31
- Lanni: "Create Monthly recon process of Benefit Enrollments/Payroll/Invoices" Complete Mar 31
- Lanni: "Train Emily on Month-end Process" On-track Jun 30
- Lanni: "Complete HR/Acctg Training Output on Wix Website" Complete Mar 31
- Lanni: "Complete Sales Tax Process Review and Issue Resolution" On-track Apr 30
- Lanni: "Getting 1 Review from Client/Contractor for 1Q 2026" On-track Mar 31
- Liza: "$85 margin add" Complete Mar 31
- Liza: "Explore appropriate personality assessment for internal hires" Complete Mar 31
- Liza: "Interview at least 15 technical recruiters" Complete Mar 31
- Liza: "Recruiting Process Check Point monthly" Complete Mar 31
- Liza: "$200 margin add" On-track Jun 28
- Liza: "Monthly Recruiting Process Check Point" On-track Jun 28
- Liza: "Hire 1 Technical Recruiter" On-track Jun 28
To-Dos:
- "Mike - create shipping labels" assigned Jon, due Apr 13
- "Liza/Lanni - Schedule AI Dashboard discussion with Mike" assigned Lanni, due Apr 6
- "Lanni- inform Mary not to include payroll service in the burden percentage" assigned Liza, due Apr 6
- "Mike- send training links to Lanni, Liza and Jon, send invite to go over" assigned Liza, due Apr 6
- "Jon and Lanni to plan and communicate preemptive measures for the energy crisis" assigned Liza, due Apr 6

### Sales
Members: Mike Dades (MD), Julia (BDM), April (BDM)
Empty — no rocks, no scorecard, no to-dos

### Sales and NonVMS
Members: Mike Dades (MD), Julia, Sheila, Tet
Empty

### VMS
Members: Chino, Zac, Dave, Rey
Empty

### Appointment Setters
Members: Mike Dades (MD), Jon Bobillo (JB), Honey (SDR)
Rocks:
- SHARED: "Set 72 meetings within 90 days" On-track Jul 31, 2025

### Back Office
Members: Lanni Aguilan (LA), Aya Delos Santos, Jon Bobillo (JB), Emily, Mary, Lisa, Rose
Departmental Rocks (9):
1. "Emily- 1Q 2026 PH Payroll Processing" Complete Mar 31 Owner: LA
2. "Lanni - Complete the HR/Acctg Training Output on the Wix Website" On-track Mar 31 Owner: LA
3. "Lanni - Monthly Recon of Invoices vs Payroll Rpts" On-track Mar 31 Owner: LA
4. "Create a Monthly recon process of Benefit Enrollments, Payroll Reports, and Invoices" On-track Mar 31 Owner: LA
5. "Aya - Getting 1 Review from a Client/Contractor for 1Q 2026" On-track Mar 31 Owner: LA
6. "Acctg- Annual Aca filing, strict requirements" On-track Apr 30 Owner: LA
7. "Acctg - Continuous Update of Comprehensive Expense Tracker" On-track May 12 Owner: LA
8. "Emily - 2Q 2026 AI Tools" On-track Jun 30 Owner: LA
9. "Mary - Train Emily on Month-end Process 2Q 2026" On-track Jun 30 Owner: LA
Aya Rocks (4):
1. "Getting 1 Review from Client/Contractor 1Q 2026 with Lhai" On-track Mar 31
2. "Checking and uploading of MSA for new clients" On-track Mar 31
3. "Research E-Verify and how to use it moving forward" Off-track Mar 31
4. "2026 Video Recording of NHOs" On-track Apr 16
Lanni Rocks (18):
1. "Send Out Quarterly Reminder on MSA Upload in Ceipal" Complete Nov 14 2025
2. "Mary- Create 2026 Contractor Masterlist" Complete Jan 31
3. "Enable Rose to prepare Month End Reports independently" Complete Feb 27
4. "Complete Assertiveness Training" On-track Mar 31
5. "Mary - Completion of WA Sales Tax Process" Complete Mar 31
6. "Emily- 1Q 2026 PH Payroll Processing" Complete Mar 31
7. "Complete HR/Acctg Training Output on Wix Website" On-track Mar 31
8. "Mary- Paying Tax Notices" On-track Mar 31
9. "Mary- SIT/SUI State Registration" On-track Mar 31
10. "Monthly Recon of Invoices vs Payroll Rpts" On-track Mar 31
11. "Monthly recon process of Benefit Enrollments" On-track Mar 31
12. "Aya - Getting 1 Review 1Q 2026" On-track Mar 31
13. "Annual Aca filing" On-track Apr 30
14. "Mary - Sales Tax Process Review" On-track Apr 30
15. "Continuous Update of Comprehensive Expense Tracker" On-track May 12
16. "Emily - 2Q 2026 AI Tools" On-track Jun 30
17. "Mary - Train Emily on Month-end Process" On-track Jun 30
18. "Emily - 2Q 2026 AI Tools (see dscptn)" On-track Jun 30
Shared Rocks (7):
1. "Mary - Train Emily for PH Payroll Process" Complete Feb 28
2. "Emily - Explore credit bureau reporting procedures" Complete Dec 31 2025
3. "Lisa - Hyper care of month end process transition with Rose" On-track Mar 31
4. "Lisa - Adding Renewal/Policy Dates to Expense Tracker" Complete Feb 27
5. "Mary - Simpler Version PTO Request" Complete Jan 9
6. "Mary - Simpler Pay Stub Downloading Tutorial" Complete Jan 9
7. "Mary - BH Connector Account Closure" On-track Apr 30

### EOS Training
Members: Mike, Jon, Lanni, Liza
Empty

### Support Specialists
Members: TBD
Empty

## V/TO (shared — already in seed.json, keep as-is)
## Accountability Chart (shared — already in seed.json, keep as-is)

## Technical Notes
- Keep everything in localStorage per-team
- seed.json loads on first visit, then localStorage takes over
- Team switcher should be a clean dropdown matching the rest of the UI
- When adding items (rocks, to-dos, issues), they go to the currently selected team
- JSON export/import should include all teams
- Keep the dark theme, keep the existing module UIs, just add multi-team data isolation
