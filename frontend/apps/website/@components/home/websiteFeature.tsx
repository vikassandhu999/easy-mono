import { IconArrowRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";
const WebstieFeature = () => {
  return (
    <section className="px-4 md:px-0 w-full mx-auto font-sans py-20 md:py-32">
      <main className="container mx-auto px-4 text-left ">
        <h1 className="font-funnel text-center  text-3xl md:text-4xl lg:text-5xl xl:text-7xl scroll-pl-48 font-normal mt-6 leading-tight">
          Your Professional Website, <br></br> Built in Minutes.
        </h1>
        <p className="text-center text-gray-600 text-lg md:text-xl mt-6 max-w-3xl mx-auto">
          Build a stunning, professional website that showcases your coaching
          services and attracts more clients. No coding required.
        </p>
        <div className="mt-12 flex justify-center">
          <Image
            src="/website_builder.avif"
            alt="Website builder interface showing coaching website customization"
            width={1200}
            height={800}
            className="rounded-xl shadow-lg"
          />
        </div>
        <Link
          href={APP_LOGIN_URL}
          className="flex gap-4 my-8 justify-between mx-auto items-center bg-blue-500 py-4 px-8  text-white font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
        >
          Build Your Brand
          <IconArrowRight />
        </Link>
      </main>
    </section>
  );
};

export default WebstieFeature;
