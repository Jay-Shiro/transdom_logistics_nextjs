"use client";

import { useState } from "react";

const faqs = [
  {
    question: "How much will my delivery cost?",
    answer:
      "Pricing depends on factors like package weight, destination, and delivery speed. Use our online calculator for an instant quote, or contact our team for personalized rates.",
  },
  {
    question: "How does Transdom Logistics work?",
    answer:
      "We're a logistics aggregator partnering with multiple local and international couriers. You provide shipment details, choose your delivery option, and we handle the rest through our network of trusted partners.",
  },
  {
    question: "Is Transdom Logistics right for me?",
    answer:
      "Absolutely! Whether you're an e-commerce seller, business, or individual, we offer solutions tailored to your needs. We simplify logistics for anyone shipping domestically or internationally.",
  },
  {
    question: "Are there any hidden fees?",
    answer:
      "No! We pride ourselves on transparent pricing. All costs are included in your quote with no surprise charges. What you see is what you pay.",
  },
  {
    question: "Can I track my shipment in real-time?",
    answer:
      "Yes! Track your packages 24/7 through our platform. You'll receive updates at every stage of delivery, from pickup to final destination.",
  },
  {
    question: "What items can't be shipped?",
    answer:
      "Some items are restricted for international shipping including hazardous materials, weapons, and certain regulated items. Our team can advise you on specific restrictions for your shipment.",
  },
];

export default function HomeFAQ() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="faq-container">
      {faqs.map((faq, index) => (
        <div key={index} className="faq-item" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
          <div className="faq-question" onClick={() => toggleFAQ(index)} role="button" aria-expanded={openFaqIndex === index} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFAQ(index); }}>
            <span itemProp="name">{faq.question}</span>
            <span className="faq-toggle" aria-hidden="true">
              {openFaqIndex === index ? "−" : "+"}
            </span>
          </div>
          <div
            className={`faq-answer ${openFaqIndex === index ? "active" : ""}`}
            itemScope
            itemProp="acceptedAnswer"
            itemType="https://schema.org/Answer"
          >
            <p itemProp="text">{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
