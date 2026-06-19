import os

content = """"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export default function ContactPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
即墨 });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (response.ok) {
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", message: "" });
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4">
            {t("contact.title")}
          </h1>
          <p className="text-xl text-gray-400">
            We would love to hear about your project. Get in touch with us.
          </p>
        </div>

        {submitted ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-gray-400">We will get back to you as soon as possible.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className巨量;
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t("contact.name")}</label>
                <input
                  type="text"
                  required wilt整合
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t("contact.email")}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">{t("contact.phone")}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">{t("contact.message")}</label>
              <textarea
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full md:w-auto px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors"
            >
              {t("contact.send")}
            </button>
          </form>
        )}

        <div className="mt-16">
          <h2 className="text-3xl font-serif font-bold mb-8">Book a Consultation</h2>
          <div className="glass-card rounded-2xl p-8">
            <div className="aspect-[4/3] bg-gray-900 rounded-xl flex items-center justify-center">
              <p className="text-gray-400">Calendly integration will be added here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open('src/app/contact/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed contact page")
