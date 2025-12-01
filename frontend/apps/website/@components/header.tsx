"use client";

const APP_LOGIN_URL = "https://admin.coacheasy.app/login";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";
import { IconArrowRight, IconMenu, IconMenu2 } from "@tabler/icons-react";

const HEADER_LINKS = [
  {
    id: "feautere",
    label: "Feature",
    link: "/#feature",
  },
  // // {
  // //   id: "resources",
  // //   label: "Resources",
  // //   link: "/",
  // // },
  {
    id: "faq",
    label: "FAQ",
    link: "/#faq",
  },

  {
    id: "support",
    label: "Support",
    link: "/support",
  },
  // {
  //   id: "pricing",
  //   label: "Pricing",
  //   link: "/",
  // },
];
const HeaderDrawer = () => {
  const [open, setOpen] = useState<boolean>(false);

  const toggleDrawer = () => setOpen(!open);

  return (
    <>
      <button
        onClick={toggleDrawer}
        className="md:hidden z-50 relative"
        aria-label="Toggle menu"
      >
        {open ? <IconMenu2 size={28} /> : <IconMenu size={28} />}
      </button>
      <div
        className={clsx(
          "fixed top-0 left-0 w-full h-screen bg-white z-40 transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <nav className="flex flex-col gap-6 p-8 mt-16">
          {HEADER_LINKS.map((link) => (
            <Link
              className="text-gray-700 text-lg capitalize hover:text-blue-500 transition-colors"
              href={link.link}
              key={link.id}
              onClick={toggleDrawer}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-4 mt-8">
            <Link
              className="py-2 px-4 border border-gray-300 hover:bg-gray-50 transition-colors text-center"
              href={APP_LOGIN_URL}
              onClick={toggleDrawer}
            >
              Login
            </Link>
            <Link
              className="bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 transition-colors text-center"
              href={APP_LOGIN_URL}
              onClick={toggleDrawer}
            >
              Get started
            </Link>
          </div>
        </nav>
      </div>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleDrawer}
          aria-hidden="true"
        />
      )}
    </>
  );
};

const Header = () => {
  return (
    <header className="top-0 sticky bg-white z-[999] flex justify-between items-center container mx-auto px-4 py-4 border-b border-gray-200 md:border-none font-sans">
      <Link href="/">
        <Image src="/logo.svg" alt="coacheasy logo" width={140} height={140} />
      </Link>
      <nav className="hidden md:flex gap-8 capitalize">
        {HEADER_LINKS.map((link) => {
          return (
            <Link className="text-gray-500 " href={link.link} key={link.id}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <nav className="flex gap-4 items-center">
        <Link className="hidden md:block hover:text-blue-500 transition-colors" href={APP_LOGIN_URL}>Login</Link>
        <Link className="w-full hidden sm:flex gap-4 justify-between items-center bg-blue-500 py-2 px-4  text-white font-semibold hover:bg-blue-600 transition-all hover:scale-105 shadow-lg" href={APP_LOGIN_URL}>
          Get Started
          <IconArrowRight />
        </Link>
        <HeaderDrawer />
      </nav>
    </header>
  );
};

export default Header;
