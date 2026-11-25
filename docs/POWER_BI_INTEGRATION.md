# MAISON VERRI — Microsoft Power BI Integration & DAX Specification

## 1. Star-Schema Data Model
Connect Power BI Desktop to the Supabase PostgreSQL views created by `supabase/powerbi_views.sql`:
- **Fact Table**: `vw_bi_fact_sales`
- **Dimension Tables**: `vw_bi_dim_date`, `vw_bi_dim_products`, `vw_bi_dim_customers`, `vw_bi_inventory_health`
- **Relationships**:
  - `vw_bi_dim_date[date_key]` (1) -> (*) `vw_bi_fact_sales[order_date]`
  - `vw_bi_dim_products[product_id]` (1) -> (*) `vw_bi_fact_sales[product_id]`
  - `vw_bi_dim_customers[user_id]` (1) -> (*) `vw_bi_fact_sales[customer_user_id]`
  - `vw_bi_dim_products[product_id]` (1) -> (*) `vw_bi_inventory_health[product_id]`

## 2. Step-by-Step Database Connection & Scheduled Refresh
1. Open **Microsoft Power BI Desktop** -> **Get Data** -> **Database** -> **PostgreSQL database**.
2. In Supabase Dashboard -> **Project Settings -> Database -> Connection Info**, copy the **Host** (e.g. `db.<project-ref>.supabase.co`, port `5432` or Supavisor pooler port `6543`) and **Database** (`postgres`).
3. Create a dedicated read-only BI role in Supabase SQL Editor:
   ```sql
   CREATE ROLE powerbi_reader WITH LOGIN PASSWORD '<STRONG_PASSWORD>';
   GRANT USAGE ON SCHEMA public TO powerbi_reader;
   GRANT SELECT ON vw_bi_dim_date, vw_bi_dim_products, vw_bi_dim_customers, vw_bi_fact_sales, vw_bi_inventory_health TO powerbi_reader;
   ```
4. Select **Import** mode (recommended for fast DAX responsiveness) or **DirectQuery** (for real-time floor monitoring), enter `powerbi_reader` credentials, and require **SSL Encryption**.
5. Publish `.pbix` to **Power BI Service** -> Workspace **Dataset Settings -> Data source credentials** -> Edit credentials using `powerbi_reader` with **Encrypt connections** enabled.
6. Under **Scheduled refresh**, enable daily/hourly refresh (up to 8x/day on Power BI Pro or 48x/day on Premium).

## 3. Core DAX Measures Library

### A. Sales Dashboard Measures
```dax
Total Revenue =
CALCULATE(
    SUM(vw_bi_fact_sales[gross_item_revenue]),
    NOT(vw_bi_fact_sales[order_status] IN {"Cancelled", "Returned"})
)

Total Orders = DISTINCTCOUNT(vw_bi_fact_sales[order_id])

Total Units Sold =
CALCULATE(
    SUM(vw_bi_fact_sales[units_sold]),
    NOT(vw_bi_fact_sales[order_status] IN {"Cancelled", "Returned"})
)

Average Order Value (AOV) = DIVIDE([Total Revenue], [Total Orders], 0)

Previous Month Revenue = CALCULATE([Total Revenue], DATEADD(vw_bi_dim_date[date_key], -1, MONTH))

Sales Growth % = DIVIDE([Total Revenue] - [Previous Month Revenue], [Previous Month Revenue], 0)
```

### B. Product Performance Measures
```dax
Product Gross Margin = [Total Revenue] - [COGS]
Product Margin % = DIVIDE([Product Gross Margin], [Total Revenue], 0)
Top Product Rank = RANKX(ALL(vw_bi_dim_products[product_name]), [Total Revenue], , DESC, Dense)
```

### C. Inventory Dashboard Measures
```dax
Total Available Stock = SUM(vw_bi_inventory_health[stock_qty])
Low Stock SKUs = CALCULATE(COUNTROWS(vw_bi_inventory_health), vw_bi_inventory_health[stock_health_status] = "Low Stock")
Out of Stock SKUs = CALCULATE(COUNTROWS(vw_bi_inventory_health), vw_bi_inventory_health[stock_health_status] = "Out of Stock")
Inventory Valuation (Cost) = SUM(vw_bi_inventory_health[inventory_cost_valuation])
Inventory Valuation (Retail) = SUM(vw_bi_inventory_health[inventory_retail_valuation])
```

### D. Customer Dashboard Measures
```dax
Total Customers = COUNTROWS(vw_bi_dim_customers)
Returning Customers = CALCULATE(COUNTROWS(vw_bi_dim_customers), vw_bi_dim_customers[lifetime_orders] > 1)
Customer Lifetime Value (Avg LTV) = AVERAGEX(vw_bi_dim_customers, vw_bi_dim_customers[lifetime_revenue])
Purchase Frequency = DIVIDE([Total Orders], [Total Customers], 0)
```

### E. Payment Dashboard Measures
```dax
Total Paid Amount = CALCULATE(SUM(vw_bi_fact_sales[gross_item_revenue]), vw_bi_fact_sales[payment_status] = "Paid")
Pending Payments = CALCULATE(SUM(vw_bi_fact_sales[gross_item_revenue]), vw_bi_fact_sales[payment_status] = "Pending")
Failed Payments = CALCULATE(SUM(vw_bi_fact_sales[gross_item_revenue]), vw_bi_fact_sales[payment_status] = "Failed")
Online Sales = CALCULATE([Total Revenue], vw_bi_fact_sales[payment_method] <> "COD")
COD Sales = CALCULATE([Total Revenue], vw_bi_fact_sales[payment_method] = "COD")
Total Refunds = SUM(vw_bi_fact_sales[refund_amount])
```

### F. Order Dashboard Measures
```dax
Delivered Orders = CALCULATE(DISTINCTCOUNT(vw_bi_fact_sales[order_id]), vw_bi_fact_sales[order_status] = "Delivered")
Order Fulfilment Rate = DIVIDE([Delivered Orders], [Total Orders], 0)
```

### G. Profit & Loss (P&L) Measures
```dax
COGS =
CALCULATE(
    SUM(vw_bi_fact_sales[item_cogs]),
    NOT(vw_bi_fact_sales[order_status] IN {"Cancelled", "Returned"})
)

Gross Profit = [Total Revenue] - [COGS]
Operating Expenses = 185000 -- Link to website_settings operating_expenses table or monthly OpEx budget
Net Profit = [Gross Profit] - [Operating Expenses]
Net Profit Margin % = DIVIDE([Net Profit], [Total Revenue], 0)
```
