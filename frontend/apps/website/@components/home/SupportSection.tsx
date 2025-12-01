import {
  IconBrandWhatsapp,
  IconBug,
  IconBulb,
  IconHeadset,
} from "@tabler/icons-react";
import Link from "next/link";

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

const SupportSection = () => {
  return (
    <section className="px-4 md:px-0 w-full mx-auto font-sans py-20 md:py-32">
      <main className="container mx-auto px-4 text-left">
        <h1 className="font-funnel text-3xl md:text-4xl lg:text-5xl xl:text-7xl scroll-pl-48 font-normal mt-6 leading-tight">
          Built for Coaches, <br></br> By People Who Care.
        </h1>
        <p className="text-left text-gray-600 text-lg md:text-xl mt-6 max-w-3xl">
          We{"'"}re not just building software—we{"'"}re building a partnership
          with you. Your feedback shapes our platform. Your success is our
          mission. We{"'"}re always here, always listening, always improving.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
          <div className="bg-white border-2 border-gray-200  p-8 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <IconBug size={32} className="text-red-600" />
              </div>
            </div>
            <h2 className="font-medium text-xl mb-3">Report a Bug</h2>
            <p className="text-gray-600 mb-6">
              Found something that{"'"}s not working right? Let us know and we
              {"'"}ll fix it fast.
            </p>
            <Link href={APP_LOGIN_URL} className="w-full py-3 px-6 border-2 border-red-500 text-red-500  font-medium hover:bg-red-500 hover:text-white transition-all block text-center">
              Report Bug
            </Link>
          </div>

          <div className="bg-white border-2 border-gray-200  p-8 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 p-4 rounded-full">
                <IconBulb size={32} className="text-yellow-600" />
              </div>
            </div>
            <h2 className="font-medium text-xl mb-3">Feature Request</h2>
            <p className="text-gray-600 mb-6">
              Have an idea that could make coaching easier? We want to hear it.
              Your input drives our roadmap.
            </p>
            <Link href={APP_LOGIN_URL} className="w-full py-3 px-6 border-2 border-yellow-500 text-yellow-600  font-medium hover:bg-yellow-500 hover:text-white transition-all block text-center">
              Request Feature
            </Link>
          </div>

          <div className="bg-white border-2 border-gray-200  p-8 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <IconHeadset size={32} className="text-blue-600" />
              </div>
            </div>
            <h2 className="font-medium text-xl mb-3">Get Support</h2>
            <p className="text-gray-600 mb-6">
              Need help? Our support team is ready to assist you every step of
              the way.
            </p>
            <Link href={APP_LOGIN_URL} className="w-full py-3 px-6 bg-blue-500 text-white font-medium hover:bg-blue-600 transition-all hover:shadow-lg block text-center">
              Contact Support
            </Link>
          </div>
        </div>
      </main>
    </section>
  );
};

export default SupportSection;
