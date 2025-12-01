import {
  IconArrowRight,
  IconChartArcs,
  IconCreditCard,
  IconMessage2,
  IconUsers,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

const FEATURES = [
  {
    name: "Manage Clients",
    id: "manage_clients",
    icon: <IconUsers size={14} />,
  },
  {
    name: "Track Progress",
    id: "progress",
    icon: <IconChartArcs size={14} />,
  },
  {
    name: "Chat and Forms",
    id: "chat_and_forms",
    icon: <IconMessage2 size={14} />,
  },
  {
    name: "Accept Payments",
    id: "accept_payment",
    icon: <IconCreditCard size={14} />,
  },
];

const Hero = () => {
  return (
    <section className="px-4 md:px-0 w-full  mx-auto font-sans py-20 md:py-32">
      <main className="container mx-auto px-4 text-left">
        <h1 className="font-funnel text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-normal mt-6 leading-tight">
          Easy, Smart and Efficient <span>fitness coaching</span>.
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-6 leading-relaxed p-2 max-w-2xl">
          Streamline client management, track progress, and deliver exceptional
          coaching experiences—all from one intelligent platform designed for
          your success.
        </p>

        <Link
          href={APP_LOGIN_URL}
          className="flex w-max gap-4 justify-between items-center bg-blue-500 py-4 px-8 text-white font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg mt-6"
        >
          Get Started
          <IconArrowRight />
        </Link>

        <div className="flex gap-2 sm:gap-4 my-12 flex-wrap">
          {FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="bg-blue-50 text-blue-400 px-2 py-1 flex items-center gap-2"
            >
              {feature.icon}
              <span className="text-sm">{feature.name}</span>
            </div>
          ))}
        </div>

        {/* Hero Image with proper aspect ratio */}
        <div className="mt-12 md:mt-24 w-full">
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/8] max-w-6xl mx-auto">
            <Image
              src="/hero-img.png"
              alt="Coaching platform dashboard preview"
              className="border-4 md:border-8 border-blue-200 object-contain object-top bg-gray-50"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, (max-width: 1280px) 80vw, 1200px"
              priority
            />
          </div>
        </div>
      </main>
    </section>
  );
};

export default Hero;
