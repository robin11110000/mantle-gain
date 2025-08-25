"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

const navigation = [
  { name: "Portfolio", href: "/portfolio" },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Mantle-Gain</span>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.8"/>
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold text-white">Mantle-Gain</span>
            </div>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
            <Menu className="h-6 w-6" aria-hidden={mobileMenuOpen} />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "text-sm font-semibold leading-6 text-gray-300 hover:text-white transition-colors",
                  pathname === item.href && "text-blue-400",
                )}
              >
                {item.name}
              </Link>
            </div>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <div>
            <Link 
              href="/dashboard" 
              prefetch={true}
              className={cn(
                buttonVariants(),
                "rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              )}
            >
              Open DEX
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ease-in-out",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 px-6 py-6 sm:max-w-sm transition-transform duration-300 ease-in-out border-l border-gray-800",
            mobileMenuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5" onClick={() => setMobileMenuOpen(false)}>
              <span className="sr-only">Mantle-Gain</span>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.8"/>
                    </svg>
                  </div>
                </div>
                <span className="text-xl font-bold text-white">Mantle-Gain</span>
              </div>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-300 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-800">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors",
                        pathname === item.href && "text-blue-400 bg-gray-800",
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </div>
                ))}
              </div>
              <div className="py-6">
                <div>
                  <Link 
                    href="/dashboard" 
                    prefetch={true} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      buttonVariants(),
                      "w-full rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    )}
                  >
                    Open DEX
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
