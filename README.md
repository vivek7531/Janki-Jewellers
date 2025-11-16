# Janki Jewellers – Gold Mortgage Manager

React + Vite application for managing gold mortgage (loan against gold) records for Janki Jewellers.

## Features

| Area | Highlights |
|------|------------|
| Authentication | Simple password gate stored in localStorage (replace in `App.jsx`). |
| New Mortgage | Auto–generated ID (prefix JJ + timestamp), monthly interest calculation. First month interest auto-charged when start date = today. |
| Interest Payments | Quick entry form; payments subtract from remaining interest and total payable. |
| Loan Details Modal | Click any active loan ID to view duration (months + days), interest summary, payments list, Pay Now shortcut. |
| Close Mortgage | Auto–prefills closing amount (principal + accrued interest minus payments). Upon closing, related interest payments are removed. |
| Closed Loans Modal | Shows principal, interest accrued to closing date, payments before close, closing payment, total paid overall (principal + interest), interest paid, principal paid, and duration. |
| Printing | Automatic 50mm label printing on save: width fixed 50mm, dynamic height measured & applied via `printDetails()`. |
| Branding | Custom logo (`public/jj-logo.png`) used on header and login screen. |

## Tech Stack
* React (hooks, single-page) + Vite for dev/build.
* Bootstrap 5 & Bootstrap Icons for UI styling.
* Google Apps Script (proxied via `/gs` endpoint) for persistence.

## Running Locally

```bash
npm install
npm run dev
```

Visit: http://localhost:5173 (default Vite port) – adjust if different.

## Printing Notes
Label printers vary: ensure printer driver / dialog uses 50mm (or nearest) paper width and disables scaling. Code measures content height and sets `@page { size: 50mm <calculated-height>mm; margin:0 }` before calling `window.print()`.

## Folder Structure
```
src/App.jsx          Main application
public/jj-logo.png   Logo displayed in UI & printable label brand line
```

## Environment / Configuration
* Update password (`CORRECT_PASSWORD`) in `src/App.jsx`.
* Adjust Apps Script proxy path if deploying under a different base URL.

## Git / GitHub Setup
Initialize repository locally, create GitHub repo named `Janki-jewellers` (recommended kebab-case), then push:

```bash
git init
git add .
git commit -m "Initial commit: Janki Jewellers gold mortgage manager"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/Janki-jewellers.git
git push -u origin main
```

If using GitHub CLI:
```bash
gh repo create Janki-jewellers --public --source=. --remote=origin --push
```

## Customization Tips
* Change logo: replace `public/jj-logo.png`.
* Modify label print layout: edit `printDetails()` in `App.jsx`.
* Interest rounding rule: see `computeInterestToDate()` and `computeInterestToDateAt()`.

## License
Add a LICENSE file (e.g. MIT) if distributing publicly.

---
Generated baseline adapted from Vite React template and extended for gold mortgage workflow.
