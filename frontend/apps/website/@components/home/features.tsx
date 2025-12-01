import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

const Features = () => {
  return (
    <section id="feature"  className="px-4 md:px-0 w-full min-h-screen mx-auto font-sans py-20 md:py-32">
      <main className="container mx-auto px-4 text-left ">
        <h1 className="font-funnel  text-3xl md:text-4xl lg:text-5xl xl:text-7xl scroll-pl-48 font-normal mt-6 leading-tight">
          The all in one{" "}
          <span className="bg-green-200 ">Coaching Platform</span>.<br></br>
          You{"'"}ve been looking for.
        </h1>
        <div className="grid grid-cols-12 my-20 gap-2">
          <div className="col-span-12 sm:col-span-6 md:col-span-8 bg-gray-50  p-8">
            <h1 className="font-medium   py-4 px-2 text-xl  rounded-lg">
              Manage clients
            </h1>
            <p className="px-2 text-gray-600">
              Keep track of all your clients in one place with comprehensive
              profiles, progress tracking, and seamless communication tools.
            </p>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-gray-50  p-8">
            <h1 className="font-medium   py-4 px-2 text-xl  rounded-lg">
              1-1 and Group Chats
            </h1>
            <p className="px-2 text-gray-600">
              Connect with your clients through private messaging or create
              group chats for community support and engagement.
            </p>
          </div>

          <div className="col-span-12 bg-gray-50  p-8">
            <h1 className="font-medium  py-4 px-2 text-xl  rounded-lg">
              Content Library for{" "}
              <span className="bg-cyan-100   ">Nutrition Plans</span>,{" "}
              <span className="bg-orange-100 ">Recipes</span>,{" "}
              <span className="bg-yellow-100 ">Workouts</span> and{" "}
              <span className="bg-purple-200 ">Exercises</span>.
            </h1>
            <p className="px-2 text-gray-600">
              Access a comprehensive library of pre-built content or create your
              own custom nutrition plans, recipes, workouts, and exercises to
              share with clients.
            </p>
          </div>

          <div className="col-span-12 sm:col-span-6 bg-gray-50  p-8">
            <h1 className="font-medium  py-4 px-2 text-xl  rounded-lg">
              Accept Payments{" "}
            </h1>
            <p className="px-2 text-gray-600">
              Streamline your billing with integrated payment processing. Accept
              payments securely and manage subscriptions effortlessly.
            </p>
          </div>

          <div className="col-span-12 sm:col-span-6 bg-gray-50  p-8">
            <h1 className="font-medium  py-4 px-2 text-xl  rounded-lg">
              Grow with a team{" "}
            </h1>
            <p className="px-2 text-gray-600">
              Scale your coaching business by collaborating with other coaches
              and team members to serve more clients effectively.
            </p>
          </div>
        </div>

        <Link href={APP_LOGIN_URL} className="w-max flex gap-4 justify-between mx-auto items-center bg-blue-500 py-4 px-8 text-white font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg">
         Get Started
          <IconArrowRight />
        </Link>
      </main>
    </section>
  );
};

export default Features;
