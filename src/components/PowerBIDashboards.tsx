import React, { useEffect, useState } from 'react';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../utils/format';

type BiReportKey = 'sales' | 'products' | 'inventory' | 'customers' | 'payments' | 'orders' | 'pnl';

export function PowerBIDashboards() {
  const { apiFetch, token, notify } = useStore();
  const [activeReport, setActiveReport] = useState<BiReportKey>('sales');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: 'all',
    productId: 'all',
    customerEmail: 'all',
    paymentMethod: 'all',
    orderStatus: 'all',
  });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.startDate) qs.set('startDate', filters.startDate);
      if (filters.endDate) qs.set('endDate', filters.endDate);
      if (filters.categoryId !== 'all') qs.set('categoryId', filters.categoryId);
      if (filters.productId !== 'all') qs.set('productId', filters.productId);
      if (filters.customerEmail !== 'all') qs.set('customerEmail', filters.customerEmail);
      if (filters.paymentMethod !== 'all') qs.set('paymentMethod', filters.paymentMethod);
      if (filters.orderStatus !== 'all') qs.set('orderStatus', filters.orderStatus);

      const res = await apiFetch(`/api/admin/bi/analytics?${qs.toString()}`);
      setData(res);
    } catch (err: any) {
      notify(err.message || 'Unable to load Power BI metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const handleDownloadCsv = async (type: 'sales' | 'products' | 'inventory' | 'customers') => {
    try {
      const res = await fetch(`/api/admin/bi/export?type=${type}&format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maison-verri-${type}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify(`Exported ${type} report (Excel CSV).`, 'success');
    } catch (err: any) {
      notify(err.message || 'CSV export failed.', 'error');
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      categoryId: 'all',
      productId: 'all',
      customerEmail: 'all',
      paymentMethod: 'all',
      orderStatus: 'all',
    });
  };

  const reportTabs: Array<{ id: BiReportKey; label: string }> = [
    { id: 'sales', label: 'A. Sales' },
    { id: 'products', label: 'B. Product Performance' },
    { id: 'inventory', label: 'C. Inventory' },
    { id: 'customers', label: 'D. Customer' },
    { id: 'payments', label: 'E. Payment' },
    { id: 'orders', label: 'F. Order' },
    { id: 'pnl', label: 'G. Profit & Loss' },
  ];

  const maxMonthlyRev = Math.max(
    1,
    ...((data?.sales?.monthlyTrend || []).map((m: any) => Number(m.revenue || 0)))
  );

  return (
    <div className="space-y-6">
      {/* Interactive Filter Slicer Bar (Power BI Style) */}
      <div className="bg-white border border-[#E5DEC9] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE9DD] pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#111111]">
            <Filter className="w-3.5 h-3.5 text-[#B8924A]" />
            <span>Interactive BI Slicers</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['sales', 'products', 'inventory', 'customers'] as const).map((exp) => (
              <button
                key={exp}
                type="button"
                onClick={() => handleDownloadCsv(exp)}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D6CCB8] text-[11px] font-medium text-[#111111] hover:border-[#B8924A] cursor-pointer"
              >
                <Download className="w-3 h-3 text-[#B8924A]" />
                <span className="capitalize">{exp} CSV</span>
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-[#9A7736] hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <input
            type="date"
            aria-label="Start date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          />
          <input
            type="date"
            aria-label="End date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          />
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          >
            <option value="all">All Categories</option>
            {(data?.filterOptions?.categories || []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.productId}
            onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          >
            <option value="all">All Products</option>
            {(data?.filterOptions?.products || []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filters.customerEmail}
            onChange={(e) => setFilters({ ...filters, customerEmail: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          >
            <option value="all">All Customers</option>
            {(data?.filterOptions?.customers || []).map((c: any) => (
              <option key={c.email} value={c.email}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.paymentMethod}
            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          >
            <option value="all">All Payments</option>
            {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filters.orderStatus}
            onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
            className="border border-[#D6CCB8] px-2.5 py-1.5 bg-[#FAF8F5]"
          >
            <option value="all">All Statuses</option>
            {['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-[#EFE9DD] border border-[#E2D8C6]">
        {reportTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveReport(t.id)}
            className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeReport === t.id ? 'bg-[#111111] text-white' : 'text-[#57534E] hover:text-[#111111]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="h-72 bg-[#EFE9DD] animate-pulse border border-[#E5DEC9]" />
      ) : (
        <>
          {/* A. SALES DASHBOARD */}
          {activeReport === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Net Revenue" value={formatINR(data.sales.totalRevenue)} />
                <KpiCard label="Gross Sales" value={formatINR(data.sales.totalSales)} />
                <KpiCard label="Total Orders" value={String(data.sales.totalOrders)} />
                <KpiCard label="Avg Order Value" value={formatINR(data.sales.averageOrderValue)} />
                <KpiCard label="Units Sold" value={String(data.sales.totalUnitsSold)} />
                <KpiCard
                  label="MoM Growth %"
                  value={`${data.sales.salesGrowthPct > 0 ? '+' : ''}${data.sales.salesGrowthPct}%`}
                  accent={data.sales.salesGrowthPct >= 0 ? 'positive' : 'negative'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#E5DEC9] p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                    Monthly Sales Trend Analysis
                  </h3>
                  <div className="space-y-3">
                    {data.sales.monthlyTrend.map((m: any) => {
                      const pct = Math.max(4, Math.round((m.revenue / maxMonthlyRev) * 100));
                      return (
                        <div key={m.month} className="space-y-1 text-xs tabular-nums">
                          <div className="flex justify-between">
                            <span className="font-mono text-[#111111]">{m.month}</span>
                            <span className="text-[#57534E]">{m.orders} orders · <strong className="text-[#111111]">{formatINR(m.revenue)}</strong></span>
                          </div>
                          <div className="h-2.5 bg-[#F2ECE1] w-full">
                            <div className="h-full bg-[#B8924A]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white border border-[#E5DEC9] p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                    Daily Revenue Ledger
                  </h3>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-left tabular-nums">
                      <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                        <tr><th className="py-2">Date</th><th className="py-2 text-right">Orders</th><th className="py-2 text-right">Revenue</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3EDE2]">
                        {data.sales.dailyTrend.map((d: any) => (
                          <tr key={d.day}>
                            <td className="py-2 font-mono">{d.day}</td>
                            <td className="py-2 text-right">{d.orders}</td>
                            <td className="py-2 text-right font-medium">{formatINR(d.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. PRODUCT PERFORMANCE */}
          {activeReport === 'products' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#E5DEC9] p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                    Top 10 Best-Selling &amp; Product Profitability
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left tabular-nums">
                      <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                        <tr>
                          <th className="py-2">Product</th>
                          <th className="py-2">Category</th>
                          <th className="py-2 text-right">Units</th>
                          <th className="py-2 text-right">Revenue</th>
                          <th className="py-2 text-right">Gross Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3EDE2]">
                        {data.productPerformance.top10Products.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-2 font-medium text-[#111111]">{p.name}</td>
                            <td className="py-2 text-[#57534E]">{p.category_name}</td>
                            <td className="py-2 text-right">{p.units_sold}</td>
                            <td className="py-2 text-right">{formatINR(p.revenue)}</td>
                            <td className="py-2 text-right text-emerald-800 font-medium">{formatINR(p.gross_profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Category-Wise Sales</h3>
                    <div className="space-y-2 text-xs tabular-nums">
                      {data.productPerformance.categoryWiseSales.map((c: any) => (
                        <div key={c.category} className="flex justify-between py-1 border-b border-[#F3EDE2]">
                          <span>{c.category}</span>
                          <span className="font-medium">{c.units} units · {formatINR(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-[#E5DEC9] p-4 space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-[#111111]">Size-Wise Units</h4>
                      {data.productPerformance.sizeWiseSales.map((s: any) => (
                        <div key={s.size} className="flex justify-between text-xs tabular-nums">
                          <span>{s.size}</span><span className="font-mono">{s.units}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border border-[#E5DEC9] p-4 space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-[#111111]">Color-Wise Units</h4>
                      {data.productPerformance.colorWiseSales.map((c: any) => (
                        <div key={c.color} className="flex justify-between text-xs tabular-nums">
                          <span className="truncate pr-2">{c.color}</span><span className="font-mono">{c.units}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E5DEC9] p-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-[#111111]">Fast-Moving Products ({data.productPerformance.fastMoving.length})</h3>
                  {data.productPerformance.fastMoving.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex justify-between text-xs py-1 border-b border-[#F3EDE2] tabular-nums">
                      <span>{p.name}</span><span className="font-mono text-emerald-800">{p.units_sold} sold</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-[#E5DEC9] p-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-[#111111]">Slow / Lowest-Selling Products</h3>
                  {data.productPerformance.lowestProducts.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-xs py-1 border-b border-[#F3EDE2] tabular-nums">
                      <span>{p.name}</span><span className="font-mono text-[#9A7736]">{p.units_sold} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* C. INVENTORY DASHBOARD */}
          {activeReport === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KpiCard label="Total Available Stock" value={String(data.inventory.totalAvailableStock)} />
                <KpiCard label="Low Stock Variants" value={String(data.inventory.lowStockCount)} accent="warning" />
                <KpiCard label="Out of Stock Variants" value={String(data.inventory.outOfStockCount)} accent="negative" />
                <KpiCard label="Cost Valuation" value={formatINR(data.inventory.inventoryCostValuation)} />
                <KpiCard label="Retail Valuation" value={formatINR(data.inventory.inventoryRetailValuation)} />
              </div>

              <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                  Reorder Alerts &amp; Stock Health
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left tabular-nums">
                    <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                      <tr>
                        <th className="py-2">SKU</th>
                        <th className="py-2">Product</th>
                        <th className="py-2">Variant</th>
                        <th className="py-2 text-right">In Stock</th>
                        <th className="py-2 text-right">Reorder Threshold</th>
                        <th className="py-2 text-right">Cost Value</th>
                        <th className="py-2">Alert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3EDE2]">
                      {data.inventory.reorderAlerts.map((v: any) => (
                        <tr key={v.variant_id}>
                          <td className="py-2 font-mono">{v.sku}</td>
                          <td className="py-2 font-medium">{v.name}</td>
                          <td className="py-2">{v.size} · {v.color}</td>
                          <td className="py-2 text-right font-mono">{v.stock_qty}</td>
                          <td className="py-2 text-right font-mono">{v.reorder_level}</td>
                          <td className="py-2 text-right">{formatINR(v.cost_valuation)}</td>
                          <td className={`py-2 font-semibold ${v.stock_qty === 0 ? 'text-red-700' : 'text-amber-700'}`}>
                            {v.stock_qty === 0 ? 'Out of Stock' : 'Low Stock'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* D. CUSTOMER DASHBOARD */}
          {activeReport === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KpiCard label="Active Customers" value={String(data.customers.totalCustomers)} />
                <KpiCard label="New Customers" value={String(data.customers.newCustomers)} />
                <KpiCard label="Returning Customers" value={String(data.customers.returningCustomers)} />
                <KpiCard label="Purchase Frequency" value={`${data.customers.purchaseFrequency}x`} />
                <KpiCard label="Average Client LTV" value={formatINR(data.customers.averageLtv)} />
              </div>

              <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                  Top Customers &amp; Customer-Wise Revenue
                </h3>
                <table className="w-full text-xs text-left tabular-nums">
                  <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                    <tr>
                      <th className="py-2">Client Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2 text-right">Orders</th>
                      <th className="py-2 text-right">Lifetime Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EDE2]">
                    {data.customers.topCustomers.map((c: any) => (
                      <tr key={c.customer_email}>
                        <td className="py-2 font-medium text-[#111111]">{c.customer_name}</td>
                        <td className="py-2 text-[#57534E]">{c.customer_email}</td>
                        <td className="py-2 text-right font-mono">{c.orders_count}</td>
                        <td className="py-2 text-right font-semibold">{formatINR(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* E. PAYMENT DASHBOARD */}
          {activeReport === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Total Paid" value={formatINR(data.payments.total_paid)} accent="positive" />
                <KpiCard label="Pending Payments" value={formatINR(data.payments.pending_payments)} accent="warning" />
                <KpiCard label="Failed Payments" value={formatINR(data.payments.failed_payments)} accent="negative" />
                <KpiCard label="Online Sales" value={formatINR(data.payments.online_sales)} />
                <KpiCard label="COD Sales" value={formatINR(data.payments.cod_sales)} />
                <KpiCard label="Refund Amount" value={formatINR(data.payments.refund_amount)} />
              </div>

              <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                  Payment Method Breakdown ({data.payments.cod_orders} COD Orders)
                </h3>
                <table className="w-full text-xs text-left tabular-nums">
                  <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                    <tr><th className="py-2">Method</th><th className="py-2 text-right">Orders</th><th className="py-2 text-right">Volume</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EDE2]">
                    {data.payments.methodBreakdown.map((m: any) => (
                      <tr key={m.method}>
                        <td className="py-2 font-medium">{m.method}</td>
                        <td className="py-2 text-right font-mono">{m.orders}</td>
                        <td className="py-2 text-right font-semibold">{formatINR(m.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* F. ORDER DASHBOARD */}
          {activeReport === 'orders' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total Orders" value={String(data.orders.totalOrders)} />
                <KpiCard label="Delivered Orders" value={String(data.orders.Delivered)} accent="positive" />
                <KpiCard label="In Progress (Pending/Conf/Ship)" value={String(data.orders.Pending + data.orders.Confirmed + data.orders.Shipped)} />
                <KpiCard label="Fulfilment Rate %" value={`${data.orders.fulfilmentRate}%`} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Pending" value={String(data.orders.Pending)} />
                <KpiCard label="Confirmed" value={String(data.orders.Confirmed)} />
                <KpiCard label="Shipped" value={String(data.orders.Shipped)} />
                <KpiCard label="Delivered" value={String(data.orders.Delivered)} />
                <KpiCard label="Cancelled" value={String(data.orders.Cancelled)} />
                <KpiCard label="Returned" value={String(data.orders.Returned)} />
              </div>
            </div>
          )}

          {/* G. PROFIT & LOSS DASHBOARD */}
          {activeReport === 'pnl' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard label="Total Revenue" value={formatINR(data.pnl.totalRevenue)} />
                <KpiCard label="Cost of Goods (COGS)" value={formatINR(data.pnl.cogs)} />
                <KpiCard label="Gross Profit" value={formatINR(data.pnl.grossProfit)} />
                <KpiCard label="Operating Expenses" value={formatINR(data.pnl.operatingExpenses)} />
                <KpiCard
                  label="Net Profit"
                  value={formatINR(data.pnl.netProfit)}
                  accent={data.pnl.netProfit >= 0 ? 'positive' : 'negative'}
                />
                <KpiCard label="Net Profit Margin %" value={`${data.pnl.profitMarginPct}%`} />
              </div>

              <div className="bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                  Monthly Profit &amp; Loss Statement (Monthly OpEx: {formatINR(data.pnl.monthlyOperatingExpenses)})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left tabular-nums">
                    <thead className="border-b border-[#E5DEC9] text-[#78716C]">
                      <tr>
                        <th className="py-2">Month</th>
                        <th className="py-2 text-right">Revenue</th>
                        <th className="py-2 text-right">COGS</th>
                        <th className="py-2 text-right">Gross Profit</th>
                        <th className="py-2 text-right">OpEx</th>
                        <th className="py-2 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3EDE2]">
                      {data.pnl.monthlyPnl.map((row: any) => (
                        <tr key={row.month}>
                          <td className="py-2 font-mono font-medium">{row.month}</td>
                          <td className="py-2 text-right">{formatINR(row.revenue)}</td>
                          <td className="py-2 text-right text-[#57534E]">{formatINR(row.cogs)}</td>
                          <td className="py-2 text-right">{formatINR(row.gross_profit)}</td>
                          <td className="py-2 text-right text-[#57534E]">{formatINR(row.operating_expenses)}</td>
                          <td className={`py-2 text-right font-semibold ${row.net_profit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                            {formatINR(row.net_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'positive' | 'negative' | 'warning';
}) {
  const valueCls =
    accent === 'positive'
      ? 'text-emerald-800'
      : accent === 'negative'
      ? 'text-red-700'
      : accent === 'warning'
      ? 'text-amber-700'
      : 'text-[#111111]';

  return (
    <div className="bg-white border border-[#E5DEC9] p-4 space-y-1">
      <p className="text-[11px] text-[#78716C] truncate">{label}</p>
      <p className={`text-lg font-semibold font-mono tabular-nums truncate ${valueCls}`}>{value}</p>
    </div>
  );
}
