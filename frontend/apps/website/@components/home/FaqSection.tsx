"use client";
import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

const FAQ_DATA = [
  {
    id: 1,
    question: "What is CoachEasy and who is it for?",
    answer:
      "CoachEasy is an all-in-one coaching platform designed specifically for fitness coaches, personal trainers, and nutrition coaches. It helps you manage clients, create workout and nutrition plans, track progress, communicate with clients, and grow your coaching business—all from one simple platform.",
  },
  {
    id: 2,
    question: "Do I need technical skills to use CoachEasy?",
    answer:
      "Not at all! CoachEasy is built with simplicity in mind. You don't need any technical skills or coding knowledge. Our intuitive interface makes it easy to get started in minutes, and our support team is always here to help if you need assistance.",
  },
  {
    id: 3,
    question: "Can I use CoachEasy on my mobile device?",
    answer:
      "Yes! CoachEasy is fully mobile-optimized, so you can manage your coaching business on the go. Whether you're at the gym, traveling, or away from your desk, you can access all features from your smartphone or tablet.",
  },
  {
    id: 4,
    question: "How does billing and payments work?",
    answer:
      "CoachEasy integrates with secure payment processors to help you accept payments from clients seamlessly. You can set up one-time payments, recurring subscriptions, and payment plans. All transactions are secure and encrypted.",
  },
  {
    id: 5,
    question: "Can I customize my coaching programs and content?",
    answer:
      "Absolutely! You have full control to create custom workout plans, nutrition plans, recipes, and exercises. You can build your own content library or use pre-built templates to save time. Everything is customizable to match your coaching style.",
  },
  {
    id: 6,
    question: "Is there a limit to how many clients I can have?",
    answer:
      "This depends on your subscription plan. We offer different tiers to accommodate coaches at various stages of their business. Whether you're just starting out or managing hundreds of clients, we have a plan that fits your needs.",
  },
  {
    id: 7,
    question: "Can I build my own website with CoachEasy?",
    answer:
      "Yes! CoachEasy includes a website builder that lets you create a professional coaching website in minutes. Showcase your services, accept new clients, and establish your online presence—all without hiring a developer.",
  },
  {
    id: 8,
    question: "How do I communicate with my clients?",
    answer:
      "CoachEasy offers built-in messaging features including 1-on-1 chats and group chats. You can communicate with clients in real-time, share updates, provide feedback, and build a supportive community—all within the platform.",
  },
  {
    id: 9,
    question: "What kind of support do you offer?",
    answer:
      "We offer comprehensive support including email support, help documentation, video tutorials, and a knowledge base. Our team is committed to your success and typically responds to inquiries within 24 hours. Premium plans include priority support.",
  },
  {
    id: 10,
    question: "Can I try CoachEasy before committing to a paid plan?",
    answer:
      "Yes! We offer a free trial so you can explore all features and see if CoachEasy is the right fit for your coaching business. No credit card required to start your trial.",
  },
];

const FaqSection = () => {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggleFaq = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="px-4 md:px-0 w-full mx-auto font-sans py-20 md:py-32 bg-gray-50">
      <main className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="font-funnel text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-normal leading-tight">
            Frequently Asked <br className="hidden md:block" /> Questions
          </h1>
          <p className="text-gray-600 text-lg md:text-xl mt-6 max-w-2xl mx-auto">
            Got questions? We{"'"}ve got answers. Here are the most common
            questions we receive from coaches.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {FAQ_DATA.map((faq) => (
            <div
              key={faq.id}
              className="bg-white border border-gray-200  overflow-hidden transition-all hover:shadow-md"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-lg pr-8">{faq.question}</h3>
                <IconChevronDown
                  size={24}
                  className={`flex-shrink-0 transition-transform duration-300 ${
                    openId === faq.id ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openId === faq.id ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </section>
  );
};

export default FaqSection;
