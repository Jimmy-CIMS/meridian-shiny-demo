# Meridian Retail Intelligence

A modern, interactive R Shiny demo for retail analytics, customer insights, and scenario planning, with rich charts and switchable UI modes.

**Suggested GitHub repository:** `meridian-shiny-demo`

Meridian turns 16,000 reproducible synthetic orders into an interactive retail workspace. Its warm ivory, forest green, and terracotta interface combines editorial typography with responsive analytics. All application content, source comments, and documentation are in English.

## Run locally

Requires R 4.1 or later. From the repository root:

```sh
Rscript setup.R
Rscript run.R
```

Open **http://127.0.0.1:3838**. You can also open `app.R` in RStudio and select **Run App**.

Dependencies are **shiny** and **bslib**; **testthat** is used for verification. Installation requires internet access. Once installed, the app needs no external APIs, accounts, CDN assets, or network access.

To change the listening address or port:

```sh
HOST=0.0.0.0 PORT=8080 Rscript run.R
```

## Explore the demo

| Page | What to explore |
| --- | --- |
| **Overview** | Revenue, orders, average order value, gross margin, monthly trends, category performance, channel share, and regional sales. |
| **Sales explorer** | Product category drill-down, revenue or units, monthly momentum, and a weekday activity heatmap. |
| **Customer insights** | Active customers, repeat purchase rate, customer spending, purchase-frequency segments, and cohort retention. |
| **Scenario lab** | Change prices, promotional discounts, marketing budgets, and demand sensitivity to compare projected revenue, profit, and orders. |
| **Report center** | Search, sort, paginate, and export matching orders or a monthly summary as CSV. |

### Suggested walkthrough

1. Start with the full-year overview and inspect chart values by hovering or focusing a data mark.
2. Click a category bar to open its sales analysis. Switch between revenue and units sold.
3. Return to Overview and click a regional bar to filter the workspace.
4. Explore customer segments and retention under the same global filters.
5. Open Scenario lab and adjust price, discount, marketing, and sensitivity.
6. Search the Report center and export matching transactions or monthly totals.
7. Try dark mode, Executive view, and Presentation view using the top toolbar.

### UI modes

- **Analyst:** dense overview with charts side by side.
- **Executive:** larger key figures and a wider category comparison.
- **Presentation:** expanded canvas with a horizontal page navigator in place of the sidebar.
- **Light and dark themes:** switch using the theme button. The preference is remembered locally when browser storage is available.

Filters for date range, region, and channel apply throughout the workspace. The product-category selector applies only to Sales explorer. Search and sort apply to the Report center and both CSV exports. **Reset** restores the global filters and the explorer category; **Reset experiment** restores scenario assumptions.

## Data and calculations

- The dataset contains **16,000 synthetic orders** dated January–December 2025, generated with seed 42. It contains no real customer or business information.
- Revenue is transaction revenue; gross profit is revenue minus product cost. Gross margin is gross profit divided by revenue. Average order value is revenue divided by order count.
- Customer segments use orders **within the filtered selection**: New = 1, Returning = 2–3, Loyal = 4–6, Champions = 7 or more.
- The customer scatter chart displays the first 350 matching customers in customer-ID order. Customer KPIs and segments use all matching customers.
- Cohorts start at each customer's first observed purchase **within the filtered data**, not their lifetime first purchase. Retention is the proportion of that cohort purchasing in each observed month. Unobserved future cells remain blank.
- Monthly summaries include months with matching transactions. Chart months without transactions display zero.
- All scenario calculations are illustrative, with no forecasting or causal claims.

### Scenario model

```text
Effective price factor = (1 + price adjustment / 100) × (1 − discount / 100)
Demand factor = max(0.05, 1 − sensitivity × (effective price factor − 1)
                              + marketing increase / 100 × 0.35)
Projected revenue = baseline revenue × effective price factor × demand factor
Incremental marketing spend = baseline revenue × marketing increase / 100 × 0.08
Projected profit = projected revenue − baseline product cost × demand factor
                   − incremental marketing spend
Projected orders = round(baseline orders × demand factor)
```

The monthly scenario chart applies this factor uniformly to baseline monthly revenue. Fixed overhead, taxes, inventory limits, and fulfillment constraints are excluded. With zero adjustments, the scenario exactly equals the baseline.

## Verification

```sh
Rscript tests/test-app.R
node --check www/app.js
node tests/test-charts.cjs
```

The R checks exercise reproducibility, combined filters, empty states, cohort calculations, baseline scenario identity, marketing cost, reactive chart totals, search, sorting, and pagination. The JavaScript checks exercise SVG generation, chart drill-down, navigation, theme switching, and empty states using a minimal DOM harness. GitHub Actions runs these commands on pushes and pull requests.

Browser visual QA was not completed in the initial development sandbox because it prohibited opening local HTTP ports. Before presenting or deploying, run the app in a browser and check desktop/mobile layouts, keyboard focus, sliders, date selection, reconnect behavior, and both CSV downloads. The container configuration and GitHub Actions configuration are provided but were not executed in that sandbox.

## Docker

```sh
docker build -t meridian-shiny-demo .
docker run --rm -p 3838:3838 meridian-shiny-demo
```

Open http://localhost:3838. The application runs as a non-root user. Building the image requires internet access for the base image and R packages.

The app can also be hosted on a standard Shiny Server, shinyapps.io, or Posit Connect deployment. It requires a running R Shiny process; it cannot be served as a static GitHub Pages site.

## Project layout

```text
app.R                      Shiny application entry point
run.R                      Host and port configuration
setup.R                    Dependency installation
R/data.R                   Reproducible synthetic orders
R/analytics.R              Filtering and calculation helpers
R/ui.R                     Five-page user interface
R/server.R                 Reactive data, charts, and exports
www/app.css                Responsive light/dark visual design
www/app.js                 Interactive SVG charts and UI navigation
tests/test-app.R           Data and reactive server checks
tests/test-charts.cjs       JavaScript chart and interaction checks
.github/workflows/         GitHub Actions validation
Dockerfile                 Container runtime
```

## GitHub metadata

**Name:** `meridian-shiny-demo`

**Description:** A modern, interactive R Shiny demo for retail analytics, customer insights, and scenario planning, with rich charts and switchable UI modes.

**Suggested topics:** `r`, `shiny`, `dashboard`, `retail-analytics`, `data-visualization`, `customer-analytics`, `scenario-planning`.

**Repository:** [Jimmy-CIMS/meridian-shiny-demo](https://github.com/Jimmy-CIMS/meridian-shiny-demo).

## License

Application code is MIT licensed. See [LICENSE](LICENSE). Bundled Go fonts use the BSD 3-Clause License; the STIX font uses the SIL Open Font License. Their notices are included under `www/fonts/`.
