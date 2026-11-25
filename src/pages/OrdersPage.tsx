import React, { useEffect, useState } from 'react';
import { Package, Printer, RotateCcw, Search, Truck, X, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { OrderRecord } from '../types';
import { formatDate, formatINR } from '../utils/format';

export function OrdersPage() {
  const { user, token, apiFetch, navigate, notify } = useStore();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupNumber, setLookupNumber] = useState('');
  const [returnModalOrder, setReturnModalOrder] = useState<OrderRecord | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRecord | null>(null);

  const loadMyOrders = async (orderNumber?: string) => {
    if (!token && !orderNumber) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const qs = orderNumber ? `?order_number=${encodeURIComponent(orderNumber)}` : '';
      const data = await apiFetch<OrderRecord[]>(`/api/orders/my${qs}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err.message || 'Unable to load orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyOrders();
  }, [token]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupNumber.trim()) return;
    loadMyOrders(lookupNumber.trim());
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      const res = await apiFetch<{ order: OrderRecord }>(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      notify('Order cancelled and inventory restored.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to cancel order.', 'error');
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrder || !returnReason.trim()) return;
    try {
      const res = await apiFetch<{ order: OrderRecord }>(`/api/orders/${returnModalOrder.id}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason: returnReason.trim() }),
      });
      setOrders((prev) => prev.map((o) => (o.id === returnModalOrder.id ? res.order : o)));
      setReturnModalOrder(null);
      setReturnReason('');
      notify('Return request submitted to our atelier concierge.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to submit return request.', 'error');
    }
  };

  const trackingSteps = ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5DEC9]">
        <div>
          <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Order Concierge</p>
          <h1 className="font-serif text-4xl text-[#111111] mt-1">My Orders &amp; Tracking</h1>
        </div>

        <form onSubmit={handleLookup} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              placeholder="Track by Order ID (e.g. MV-2026-1001)"
              className="pl-9 pr-3 py-2 bg-white border border-[#D6CCB8] text-xs w-64 focus:outline-none focus:border-[#B8924A]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#111111] text-white text-xs font-medium cursor-pointer"
          >
            Track
          </button>
        </form>
      </div>

      {!user && orders.length === 0 && !loading && (
        <div className="bg-white border border-[#E5DEC9] p-8 text-center space-y-4">
          <Package className="w-8 h-8 text-[#B8924A] mx-auto" />
          <h2 className="font-serif text-2xl text-[#111111]">Sign in to view your full order history</h2>
          <p className="text-sm text-[#57534E] max-w-md mx-auto">
            You can also enter any Order ID (for example <span className="font-mono">MV-2026-1001</span>) in the tracking bar above.
          </p>
          <button
            type="button"
            onClick={() => navigate('account')}
            className="px-6 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {loading && <div className="h-48 bg-[#EFE9DD] animate-pulse" />}

      <div className="space-y-6">
        {orders.map((order) => {
          const stepIndex =
            order.order_status === 'Delivered'
              ? 3
              : order.shipment?.status === 'Out for Delivery'
              ? 2
              : order.order_status === 'Shipped'
              ? 1
              : 0;

          return (
            <div key={order.id} className="bg-white border border-[#E5DEC9] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE9DD] pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#78716C]">
                    <span className="font-mono font-semibold text-sm text-[#111111]">{order.order_number}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDate(order.created_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{order.payment_method} ({order.payment_status})</span>
                  </div>
                  <p className="text-xs text-[#57534E]">
                    Order Status: <strong className="text-[#111111]">{order.order_status}</strong>
                    {order.shipment?.tracking_number && (
                      <> · Tracking <span className="font-mono">{order.shipment.tracking_number}</span></>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceOrder(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D6CCB8] text-xs font-medium text-[#111111] hover:border-[#B8924A] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Invoice</span>
                  </button>

                  {user && ['Pending', 'Confirmed'].includes(order.order_status) && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Order</span>
                    </button>
                  )}

                  {user && order.order_status === 'Delivered' && (!order.returns || order.returns.length === 0) && (
                    <button
                      type="button"
                      onClick={() => setReturnModalOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#111111] text-xs font-medium text-[#111111] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Return</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Shipment Progress */}
              {!['Cancelled', 'Returned'].includes(order.order_status) && (
                <div className="grid grid-cols-4 gap-2 py-2">
                  {trackingSteps.map((step, idx) => (
                    <div key={step} className="space-y-1.5">
                      <div className={`h-1 w-full ${idx <= stepIndex ? 'bg-[#B8924A]' : 'bg-[#EAE2D3]'}`} />
                      <div className="flex items-center gap-1 text-[11px] text-[#57534E]">
                        {idx === stepIndex && <Truck className="w-3 h-3 text-[#B8924A]" />}
                        <span className={idx <= stepIndex ? 'font-semibold text-[#111111]' : ''}>{step}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Line Items */}
              <div className="divide-y divide-[#F3EDE2]">
                {order.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-[#111111]">{item.product_name}</p>
                      <p className="text-xs text-[#78716C]">
                        Size {item.size} · {item.color} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-[#111111]">{formatINR(item.line_total)}</span>
                  </div>
                ))}
              </div>

              {order.returns && order.returns.length > 0 && (
                <div className="bg-[#FAF8F5] border border-[#E5DEC9] p-3 text-xs text-[#57534E]">
                  Return Request Status: <strong className="text-[#111111]">{order.returns[0].status}</strong> — {order.returns[0].reason}
                </div>
              )}

              <div className="pt-3 border-t border-[#EFE9DD] flex items-center justify-between text-sm font-semibold text-[#111111] tabular-nums">
                <span>Total Amount</span>
                <span>{formatINR(order.total_amount)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Return Modal */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleReturnSubmit} className="bg-white border border-[#E5DEC9] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-[#111111]">Request Return · {returnModalOrder.order_number}</h3>
              <button type="button" onClick={() => setReturnModalOrder(null)} className="p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Please describe sizing exchange or return reason..."
              className="w-full border border-[#D6CCB8] p-3 text-sm bg-[#FAF8F5]"
            />
            <button type="submit" className="w-full py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider cursor-pointer">
              Submit Return Request
            </button>
          </form>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5DEC9] max-w-2xl w-full p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-[#E5DEC9] pb-4">
              <div>
                <h2 className="font-serif text-2xl tracking-[0.12em] text-[#111111]">MAISON VERRI</h2>
                <p className="text-xs text-[#78716C]">Tax Invoice · GSTIN 27AABCM8912K1Z4</p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#111111] text-white text-xs font-medium cursor-pointer"
                >
                  Print / Save PDF
                </button>
                <button type="button" onClick={() => setInvoiceOrder(null)} className="p-1.5 border border-[#D6CCB8] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="font-semibold text-[#111111]">Billed To</p>
                <p>{invoiceOrder.customer_name}</p>
                <p>{invoiceOrder.customer_email}</p>
                <p>{invoiceOrder.shipping_address?.street}</p>
                <p>{invoiceOrder.shipping_address?.city}, {invoiceOrder.shipping_address?.state} {invoiceOrder.shipping_address?.postal_code}</p>
              </div>
              <div className="text-right tabular-nums">
                <p><span className="text-[#78716C]">Invoice No:</span> {invoiceOrder.order_number}</p>
                <p><span className="text-[#78716C]">Date:</span> {formatDate(invoiceOrder.created_at)}</p>
                <p><span className="text-[#78716C]">Payment:</span> {invoiceOrder.payment_method} ({invoiceOrder.payment_status})</p>
              </div>
            </div>

            <table className="w-full text-xs text-left tabular-nums">
              <thead className="border-y border-[#E5DEC9] bg-[#FAF8F5]">
                <tr>
                  <th className="py-2 px-2">Item</th>
                  <th className="py-2 px-2">Variant</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE9DD]">
                {invoiceOrder.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 px-2">{it.product_name}</td>
                    <td className="py-2 px-2">{it.size} / {it.color}</td>
                    <td className="py-2 px-2 text-right">{it.quantity}</td>
                    <td className="py-2 px-2 text-right">{formatINR(it.unit_price)}</td>
                    <td className="py-2 px-2 text-right">{formatINR(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-[#E5DEC9] pt-4 text-xs space-y-1 max-w-xs ml-auto tabular-nums">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(invoiceOrder.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{formatINR(invoiceOrder.discount_amount)}</span></div>
              <div className="flex justify-between"><span>GST (12%)</span><span>{formatINR(invoiceOrder.tax_amount)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatINR(invoiceOrder.shipping_cost)}</span></div>
              <div className="flex justify-between pt-2 border-t border-[#E5DEC9] font-semibold text-sm text-[#111111]">
                <span>Grand Total</span>
                <span>{formatINR(invoiceOrder.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
