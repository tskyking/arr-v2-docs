# Feedback Log

## Brian priorities
- Hosted application is better than a manually maintained file or fragile local app.
- Imports must be mappable because different companies/systems/spreadsheets vary.
- ARR is not universal and must be configurable.
- Admin should be able to override ARR amount by month when needed.
- Revenue items can be recurring or non-recurring and may have different recognition schedules.
- Reporting should stand up to investors, diligence teams, and buyers.
- CRM and accounting sync/reconciliation is an important long-term workflow.
- Line-item-first design is important.
- Flexible classification fields are important.
- Outputs should be explainable with drill-down.
- Manual changes should be auditable.

## Todd preferences
- Wants a robust/resilient memory architecture for the project.
- Wants one working plan instead of fragmented planning.
- Is comfortable letting technical architecture be chosen for maintainability/flexibility/polish.
- Values practical execution over overexplaining technical stack debates.

## Additional schema insight
- Todd raised the need to distinguish parent logo/entity from site-level company/account in large enterprise relationships (e.g. Intel, AMD, Samsung).
- Important scenario: acquired sites may retain local contracts temporarily and later be absorbed into enterprise-wide licensing.
- This should be reflected in schema via Logo/LogoID, Site/SiteID, and contract scope/rollup behavior.
