import {
  IconArrowRight,
  IconChalkboardTeacher,
  IconDevices,
  IconTrashX,
} from "@tabler/icons-react";

const SimplicitySection = () => {
  return (
    <section className="px-4 md:px-0 w-full mx-auto font-sans py-20 ">
      <main className="container mx-auto px-4 text-left ">
        <h1 className="font-funnel   text-3xl md:text-4xl lg:text-5xl xl:text-7xl scroll-pl-48 font-normal mt-6 leading-tight">
          Simple by Design, <br></br> Powerful in Practice.
        </h1>
        <p className="text-left text-gray-600 text-lg md:text-xl mt-6 max-w-3xl">
          We get it. You don{"'"}t need hundreds of features you{"'"}ll never
          use. You need a platform that just works—on any device, anytime. While
          other platforms overwhelm you with complexity, we focus on what
          matters: helping you coach better, not manage software.
        </p>
        <div className="mt-12 flex justify-start flex-wrap  max-w-5xl  gap-2">
          <div className="w-full max-w-[300px] bg-white border-2 border-gray-200 p-6 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex justify-start   mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <IconDevices size={32} className="text-blue-600" />
              </div>
            </div>
            <h2 className="font-medium text-xl mb-3">Mobile First</h2>
            <p className="text-gray-600 mb-6">
              Fully optimized for mobile. Coach on the go, just like your
              clients live on the go.
            </p>
          </div>

          <div className="w-full max-w-[300px] bg-white border-2 border-gray-200 p-6 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex justify-start mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <IconTrashX size={32} className="text-orange-600" />
              </div>
            </div>
            <h2 className="font-medium text-xl mb-3">No Overwhelm</h2>
            <p className="text-gray-600 mb-6">
              Only the features you actually need. No bloat, no confusion—just
              pure efficiency.
            </p>
          </div>

          <div className="w-full max-w-[300px] bg-white border-2 border-gray-200 p-6 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex justify-start mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <IconChalkboardTeacher size={32} className="text-green-600" />
              </div>
            </div>
            <h2 className="font-medium text-xl mb-3">Built for coaches</h2>
            <p className="text-gray-600 mb-6">
              Designed with real coaching workflows in mind, not generic
              business tools.
            </p>
          </div>
        </div>

        <button className="flex gap-4 my-8 items-center bg-blue-500 py-4 px-8  text-white font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg">
          Get started
          <IconArrowRight />
        </button>
      </main>
    </section>
  );
};

export default SimplicitySection;
