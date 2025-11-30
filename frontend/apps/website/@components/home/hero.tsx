import {
  IconArrowRight,
  IconChartArcs,
  IconCreditCard,
  IconMessage2,
  IconUsers,
} from "@tabler/icons-react";
import Image from "next/image";
const Hero = () => {
  return (
    <section className="px-4 md:px-0 w-full min-h-screen mx-auto font-sans py-20 md:py-32">
      <main className="container mx-auto px-4 text-left">
        <h1 className="font-funnel  text-3xl md:text-4xl lg:text-5xl xl:text-7xl scroll-pl-48 font-normal mt-6 leading-tight">
          Easy, Smart and Efficient <span className="">fitness coaching</span>.
        </h1>
        <p className="text-sm sm:text-base  text-gray-600 mt-6  leading-relaxed  p-2 rounded-lg">
          Streamline client management, track progress, and deliver exceptional
          coaching experiences—all from one intelligent platform designed for
          your success.
        </p>

        <button className="flex gap-4 justify-between items-center bg-blue-500 py-4 px-8 text-white font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg">
          Get Started
          <IconArrowRight />
        </button>

        <div className="flex gap-2 sm:gap-4 my-12 flex-wrap ">
          {[
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
          ].map((v) => {
            return (
              <div
                key={v.id}
                className="bg-blue-50 text-blue-400  px-2 flex items-center gap-2 cursor-pointer"
              >
                {v.icon}
                <span className="text-sm">{v.name}</span>
              </div>
            );
          })}
        </div>

        <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[700px] mt-12 md:mt-32">
          <Image
            src="/hero-img.png"
            alt="Coaching platform dashboard preview"
            className="border-4 md:border-8 border-blue-200  object-cover"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
            priority
          />
        </div>
      </main>
    </section>
  );
};

export default Hero;
