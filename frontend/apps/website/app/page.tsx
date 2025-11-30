import Header from "@/@components/header";
import FaqSection from "@/@components/home/FaqSection";
import Features from "@/@components/home/features";
import Footer from "@/@components/home/Footer";
import Hero from "@/@components/home/hero";
import PricingSection from "@/@components/home/PricingSection";
import SimplicitySection from "@/@components/home/SimplicitySection";
import WebstieFeature from "@/@components/home/websiteFeature";
import { IconBrandWhatsapp } from "@tabler/icons-react";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Features />
      <WebstieFeature />
      <SimplicitySection />
      <PricingSection />
      <FaqSection />

      {/*<SupportSection />*/}

      <div className="w-full  bg-gradient-to-r from-blue-50 to-purple-50  p-8 md:p-12 mx-auto flex flex-col gap-4">
        <h3 className="font-funnel text-2xl md:text-3xl font-medium mb-4">
          Help us building.
        </h3>
        <p className="text-gray-600 text-lg">
          Every feature we build starts with listening to coaches like you. Join
          our community and help shape the future of coaching software.
        </p>
        <button className="w-max py-3 px-6 bg-green-700 text-white flex justify-center align-center font-medium  transition-all hover:shadow-lg gap-2">
          <IconBrandWhatsapp />
          Join our whatsapp.
        </button>
      </div>
      <Footer />
    </main>
  );
}
