# Changelog

All notable changes to the BillGST client application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Dashboard restructured into a feature module (`@/features/dashboard`).

### Fixed
- Financial year filter no longer hardcoded to 2026-27.
- Monthly GST total no longer overcounts invoices missing totalTax.

### Follow-ups
- Unify the two Button components (`components/ui` and `components/invoice`).
- Share one StatusBadge across Dashboard, Invoices and InvoicesTable.
- Use `/invoices/summary` instead of computing from the first 100 invoices.
- Convert `useDashboardData` to React Query.

## [1.0.0] - 2026-11-08

### Added
- App shell restructured (routes as data, layout extracted).
- Added `@/` path alias and build-time `__APP_VERSION__` injection.

