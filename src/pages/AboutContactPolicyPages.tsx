import React, { useState } from 'react';
import { ChevronDown, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { StoreLocatorMap } from '../components/StoreLocatorMap';
import type { PageRoute } from '../types';

export function AboutPage() {
  const { navigate } = useStore();
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
      <div className="space-y-4 border-b border-[#E5DEC9] pb-10">
        <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Heritage &amp; Philosophy</p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#111111]">The House of Maison Verri</h1>
        <p className="text-base text-[#4A4640] leading-relaxed max-w-3xl">
          Founded between Milanese pattern rooms and Mumbai&apos;s historic Kala Ghoda art district, Maison Verri crafts quiet luxury garments defined by architectural proportion, natural noble fibres, and transparent craftsmanship.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <img
          src="/src/assets/images/collection_womens_tailoring_1795602786165.jpg"
          alt="Maison Verri Atelier Tailoring"
          referrerPolicy="no-referrer"
          className="w-full h-80 object-cover border border-[#E5DEC9]"
        />
        <div className="flex flex-col justify-center space-y-5">
          <h2 className="font-serif text-3xl text-[#111111]">Our Mission &amp; Vision</h2>
          <p className="text-sm text-[#4A4640] leading-relaxed">
            Our mission is to replace seasonal excess with enduring silhouettes cut from GOTS-certified organic cotton, 22-momme Como mulberry silk, brushed Mongolian cashmere, and vegetable-tanned Tuscan leather.
          </p>
          <p className="text-sm text-[#4A4640] leading-relaxed">
            Every garment is individually numbered, inspected by master pattern-makers, and backed by complimentary lifetime atelier tailoring at our flagship salon.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#E5DEC9] pt-10">
        {[
          {
            title: '01. Noble Fibre Provenance',
            body: '100% traceable cashmere, virgin wool, Belgian linen, and silk sourced from certified heritage mills.',
          },
          {
            title: '02. Full-Canvas Construction',
            body: 'Hand-basted horsehair chest canvases allow blazers and overcoats to mould naturally to the wearer over decades.',
          },
          {
            title: '03. Concierge Care',
            body: 'Insured garment-box delivery, 14-day home trials, and direct WhatsApp styling assistance.',
          },
        ].map((p) => (
          <div key={p.title} className="bg-white border border-[#E5DEC9] p-6 space-y-2">
            <h3 className="font-serif text-xl text-[#111111]">{p.title}</h3>
            <p className="text-sm text-[#57534E] leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0D0D0D] text-white p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-serif text-2xl">Visit Our Kala Ghoda Flagship</h3>
          <p className="text-sm text-[#A8A095] mt-1">Book a private fitting or explore the Autumn/Winter collection online.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('shop')}
          className="px-6 py-3 bg-[#B8924A] text-[#0D0D0D] text-xs font-semibold uppercase tracking-wider cursor-pointer shrink-0"
        >
          Explore Collection
        </button>
      </div>
    </main>
  );
}

export function ContactPage() {
  const { notify } = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      notify('Your enquiry has been received. Our concierge will respond within 4 hours.', 'success');
    } catch (err: any) {
      notify(err.message || 'Unable to send enquiry.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="border-b border-[#E5DEC9] pb-8">
        <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Client Concierge</p>
        <h1 className="font-serif text-4xl text-[#111111] mt-1">Contact &amp; Flagship Salon</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#E5DEC9] p-6 space-y-5 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#B8924A] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Flagship Boutique Address</p>
                <p className="text-[#57534E]">14 Rope Walk Lane, Kala Ghoda, Fort, Mumbai 400001</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#B8924A] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Telephone</p>
                <p className="text-[#57534E] font-mono">+91 22 4890 1200</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#B8924A] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Email Concierge</p>
                <p className="text-[#57534E]">concierge@maisonverri.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#B8924A] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Business Hours</p>
                <p className="text-[#57534E]">Monday – Sunday · 10:30 AM – 8:30 PM IST</p>
              </div>
            </div>

            <a
              href="https://wa.me/912248901200?text=Hello%20Maison%20Verri%20Concierge"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#272420]"
            >
              <MessageCircle className="w-4 h-4 text-[#C6A462]" />
              <span>Chat on WhatsApp Concierge</span>
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-[#E5DEC9] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl text-[#111111]">Send a Private Enquiry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" required placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
            <input type="email" required placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
            <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
            <input type="text" required placeholder="Subject (e.g. Bespoke Fitting)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]" />
          </div>
          <textarea
            required
            rows={4}
            placeholder="How may our atelier assist you?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full border border-[#D6CCB8] px-3 py-2 text-sm bg-[#FAF8F5]"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-7 py-3 bg-[#B8924A] text-[#0D0D0D] text-xs font-semibold uppercase tracking-wider hover:bg-[#C6A462] cursor-pointer"
          >
            {sending ? 'Sending...' : 'Submit Enquiry'}
          </button>
        </form>
      </div>

      {/* Interactive Google Maps Flagship Location */}
      <div className="space-y-3">
        <h2 className="font-serif text-2xl text-[#111111]">Flagship Boutique Location</h2>
        <StoreLocatorMap />
      </div>
    </main>
  );
}

export function PolicyAndGuidePage({ page }: { page: Extract<PageRoute, 'privacy' | 'terms' | 'shipping' | 'returns' | 'faq' | 'size-guide'> }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (page === 'size-guide') {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-8">
        <div className="border-b border-[#E5DEC9] pb-6">
          <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Atelier Fit</p>
          <h1 className="font-serif text-4xl text-[#111111] mt-1">Comprehensive Size Guide</h1>
        </div>
        <div className="bg-white border border-[#E5DEC9] p-6 overflow-x-auto">
          <table className="w-full text-sm text-left tabular-nums">
            <thead className="bg-[#FAF8F5] border-b border-[#E5DEC9] text-xs uppercase">
              <tr>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Chest (in)</th>
                <th className="py-3 px-4">Waist (in)</th>
                <th className="py-3 px-4">Hip (in)</th>
                <th className="py-3 px-4">EU / IT Equivalent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9DD]">
              <tr><td className="py-3 px-4 font-semibold">XS</td><td className="py-3 px-4">32–33</td><td className="py-3 px-4">25–26</td><td className="py-3 px-4">35–36</td><td className="py-3 px-4">IT 38 / EU 34</td></tr>
              <tr><td className="py-3 px-4 font-semibold">S</td><td className="py-3 px-4">34–35</td><td className="py-3 px-4">27–28</td><td className="py-3 px-4">37–38</td><td className="py-3 px-4">IT 40 / EU 36</td></tr>
              <tr><td className="py-3 px-4 font-semibold">M</td><td className="py-3 px-4">36–37</td><td className="py-3 px-4">29–30</td><td className="py-3 px-4">39–40</td><td className="py-3 px-4">IT 42 / EU 38</td></tr>
              <tr><td className="py-3 px-4 font-semibold">L</td><td className="py-3 px-4">38–40</td><td className="py-3 px-4">31–33</td><td className="py-3 px-4">41–43</td><td className="py-3 px-4">IT 44 / EU 40</td></tr>
              <tr><td className="py-3 px-4 font-semibold">XL</td><td className="py-3 px-4">41–43</td><td className="py-3 px-4">34–36</td><td className="py-3 px-4">44–46</td><td className="py-3 px-4">IT 46 / EU 42</td></tr>
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  if (page === 'faq') {
    const faqs = [
      {
        q: 'How are Maison Verri online payments secured?',
        a: 'All UPI, Credit Card, Debit Card, and Net Banking transactions are processed through Razorpay with server-side HMAC-SHA256 verification. We never store card numbers on our servers.',
      },
      {
        q: 'What is the delivery timeline for Atelier orders?',
        a: 'Standard Atelier orders arrive within 4–5 business days (complimentary above ₹8,000). Express Concierge delivery arrives in 1–2 business days in a rigid garment presentation box.',
      },
      {
        q: 'How do returns and complimentary alterations work?',
        a: 'You may initiate a return or size exchange within 14 days of delivery directly from your My Orders page, provided original woven tags remain attached.',
      },
      {
        q: 'Do you offer Cash on Delivery (COD)?',
        a: 'Yes, Cash on Delivery is available across major Indian metropolitan pin codes up to ₹50,000 per order.',
      },
    ];
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
        <div className="border-b border-[#E5DEC9] pb-6">
          <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">Assistance</p>
          <h1 className="font-serif text-4xl text-[#111111] mt-1">Frequently Asked Questions</h1>
        </div>
        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <div key={f.q} className="bg-white border border-[#E5DEC9]">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 flex items-center justify-between text-left font-semibold text-sm text-[#111111] cursor-pointer"
              >
                <span>{f.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx && <p className="px-5 pb-5 text-sm text-[#57534E] leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </main>
    );
  }

  const copy: Record<'privacy' | 'terms' | 'shipping' | 'returns', { title: string; sections: Array<{ h: string; p: string }> }> = {
    privacy: {
      title: 'Privacy Policy',
      sections: [
        { h: 'Data Collection & Encryption', p: 'Maison Verri collects only essential client contact, shipping, and order details required to fulfill your purchases and tailor concierge care. Passwords are salted and hashed using scrypt, and payment card credentials are never persisted.' },
        { h: 'Location & Maps Integration', p: 'Our store locator uses Google Maps Platform strictly to display flagship boutique directions in compliance with Google Privacy and End User Terms.' },
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      sections: [
        { h: 'Orders & Pricing', p: 'All prices are listed inclusive of craftsmanship standards with 12% GST itemized at checkout. Promotional coupons apply strictly within stated validity windows and minimum order thresholds.' },
        { h: 'Intellectual Property', p: 'All garment silhouettes, lookbook photography, and Maison Verri trademarks remain the exclusive intellectual property of Maison Verri Atelier Pvt. Ltd.' },
      ],
    },
    shipping: {
      title: 'Shipping Policy',
      sections: [
        { h: 'Complimentary & Express Tiers', p: 'Orders above ₹8,000 qualify for complimentary Standard Atelier shipping (4–5 business days). Express Concierge courier service (1–2 business days) is available nationwide for ₹450.' },
        { h: 'Insured Dispatch', p: 'Every shipment is dispatched from our Mumbai Flagship Vault with real-time tracking numbers visible under My Orders.' },
      ],
    },
    returns: {
      title: 'Return & Refund Policy',
      sections: [
        { h: '14-Day Return Window', p: 'Unworn garments with intact atelier seals may be returned or exchanged within 14 days of delivery through your My Orders dashboard.' },
        { h: 'Automated Refund Timeline', p: 'Approved online payment refunds are credited to the original Razorpay payment instrument within 5–7 business days.' },
      ],
    },
  };

  const doc = copy[page];
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
      <div className="border-b border-[#E5DEC9] pb-6">
        <p className="text-xs tracking-[0.16em] uppercase text-[#9A7736]">House Policies</p>
        <h1 className="font-serif text-4xl text-[#111111] mt-1">{doc.title}</h1>
      </div>
      <div className="space-y-6 bg-white border border-[#E5DEC9] p-8">
        {doc.sections.map((s) => (
          <div key={s.h} className="space-y-2">
            <h2 className="font-serif text-2xl text-[#111111]">{s.h}</h2>
            <p className="text-sm text-[#4A4640] leading-relaxed">{s.p}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
