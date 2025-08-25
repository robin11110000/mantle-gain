import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 flex-1 flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:py-32 lg:px-8">
          <div className="max-w-2xl animate-fade-in text-center mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl text-white mb-6">
              Trade <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Smarter</span>
            </h1>
            <p className="text-lg sm:text-xl leading-8 text-gray-300 mb-10 max-w-3xl mx-auto">
              Mantle-Gain finds the best prices across Mantle Network DEXs and executes optimal trades automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/dashboard" 
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold text-lg transition-colors min-w-[200px] text-center"
              >
                Start Trading
              </Link>
              <Link 
                href="/portfolio" 
                className="px-8 py-4 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white rounded-full font-semibold text-lg transition-colors min-w-[200px] text-center"
              >
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block opacity-30">
          <div className="relative h-[400px] w-[400px]">
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full bg-blue-500 opacity-60 animate-pulse"></div>
            <div
              className="absolute top-1/4 right-1/4 h-24 w-24 rounded-full bg-purple-500 opacity-40 animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
            <div
              className="absolute bottom-1/3 left-1/3 h-20 w-20 rounded-full bg-pink-500 opacity-50 animate-pulse"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>
        </div>
      </section>
    </div>
  )
}