import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/dashboard");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col auth-bg">
      <nav className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-3 px-6 flex justify-between items-center shadow-md bg-opacity-90">
        <div className="flex items-center">
          <Image
            src="/Smart.png"
            alt="Smart Wealth Logo"
            width={50}
            height={50}
            className="rounded-full shadow-sm"
          />
          <span className="ml-3 text-xl font-bold">SmartWealth Finance</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login">
            <span className="bg-white text-blue-700 px-4 py-2 rounded-full font-medium hover:bg-blue-50 transition duration-300 ease-in-out">Login</span>
          </Link>
          <Link href="/signup">
            <span className="bg-transparent border-2 border-white text-white px-4 py-1.5 rounded-full font-medium hover:bg-white hover:bg-opacity-10 transition duration-300 ease-in-out">Sign Up</span>
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center flex-grow h-screen">
        <div className="bg-white bg-opacity-95 p-10 rounded-xl shadow-2xl text-center w-full max-w-4xl mx-4 flex flex-col justify-center">
          <Image
            src="/Smart.png"
            alt="Smart Wealth Logo"
            width={220}
            height={150}
            className="mx-auto drop-shadow-md"
          />
          <h2 className="text-5xl font-extrabold mt-6 bg-gradient-to-r from-blue-600 to-indigo-800 text-transparent bg-clip-text">Welcome to SmartWealth Finance</h2>
          <p className="mt-6 text-xl text-gray-600">Your intelligent financial companion powered by AI</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-full font-bold text-lg hover:from-blue-700 hover:to-indigo-800 transition duration-300 ease-in-out shadow-md inline-block">Get Started</span>
            </Link>
            <Link href="/login">
              <span className="bg-gray-100 text-gray-800 px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-200 transition duration-300 ease-in-out shadow-md inline-block">Login</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50 text-center">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold mb-12 text-gray-800">Our Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg transform transition duration-500 hover:scale-105">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h4 className="text-3xl font-bold text-blue-600">4.8/5</h4>
              <p className="mt-3 text-gray-600 font-medium">App Rating</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg transform transition duration-500 hover:scale-105">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h4 className="text-3xl font-bold text-indigo-600">1M+</h4>
              <p className="mt-3 text-gray-600 font-medium">Downloads</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg transform transition duration-500 hover:scale-105">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-3xl font-bold text-purple-600">$10B+</h4>
              <p className="mt-3 text-gray-600 font-medium">Transactions Tracked</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-white text-center">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold mb-12 text-gray-800">Powerful Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="bg-white p-4 rounded-full inline-block mb-6 shadow-md">
                <Image src="/feature-1.png" alt="Feature 1" width={80} height={80} className="rounded-lg" />
              </div>
              <h4 className="text-xl font-bold text-blue-700 mb-3">Smart Receipt Scanner</h4>
              <p className="text-gray-600 text-center">Extract data automatically from receipts using our advanced AI technology. Save time and eliminate manual entry errors.</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="bg-white p-4 rounded-full inline-block mb-6 shadow-md">
                <Image src="/feature-2.jpg" alt="Feature 2" width={80} height={80} className="rounded-lg" />
              </div>
              <h4 className="text-xl font-bold text-indigo-700 mb-3">Advanced Analytics</h4>
              <p className="text-gray-600 text-center">Get detailed insights into your spending patterns with AI-powered analytics. Visualize your financial health with intuitive charts.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="bg-white p-4 rounded-full inline-block mb-6 shadow-md">
                <Image src="/feature-3.png" alt="Feature 3" width={80} height={80} className="rounded-lg" />
              </div>
              <h4 className="text-xl font-bold text-purple-700 mb-3">Automated Insights</h4>
              <p className="text-gray-600 text-center">Receive personalized financial insights and recommendations. Let our AI help you make smarter financial decisions.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-gradient-to-r from-indigo-50 to-blue-50 text-center">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold mb-12 text-gray-800">What Our Users Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-4">
                <svg className="w-8 h-8 text-yellow-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.128 19.825c.209.209.493.325.792.325.086 0 .172-.011.257-.033l5.443-1.361c.175-.044.342-.138.475-.271l8.736-8.736c.566-.566.566-1.486 0-2.052l-3.276-3.276c-.566-.566-1.486-.566-2.052 0l-8.736 8.736c-.133.133-.227.3-.271.475l-1.361 5.443c-.067.269-.011.549.153.713zm8.555-12.254l4.192 4.192-1.009 1.01-4.192-4.193 1.009-1.009zm-6.552 8.562l1.039-4.155 3.117 3.117-4.156 1.038z"/>
                </svg>
              </div>
              <p className="text-gray-600 italic mb-6">"SmartWealth has transformed my financial planning! The AI insights have helped me save over $300 monthly."</p>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold">S</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Sushmitha</p>
                  <p className="text-sm text-gray-500">Product Manager</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-4">
                <svg className="w-8 h-8 text-yellow-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.128 19.825c.209.209.493.325.792.325.086 0 .172-.011.257-.033l5.443-1.361c.175-.044.342-.138.475-.271l8.736-8.736c.566-.566.566-1.486 0-2.052l-3.276-3.276c-.566-.566-1.486-.566-2.052 0l-8.736 8.736c-.133.133-.227.3-.271.475l-1.361 5.443c-.067.269-.011.549.153.713zm8.555-12.254l4.192 4.192-1.009 1.01-4.192-4.193 1.009-1.009zm-6.552 8.562l1.039-4.155 3.117 3.117-4.156 1.038z"/>
                </svg>
              </div>
              <p className="text-gray-600 italic mb-6">"Incredible insights and so easy to use. The receipt scanner is a game-changer for tracking my business expenses!"</p>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-indigo-600 font-bold">R</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Ruchitha</p>
                  <p className="text-sm text-gray-500">Small Business Owner</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-4">
                <svg className="w-8 h-8 text-yellow-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.128 19.825c.209.209.493.325.792.325.086 0 .172-.011.257-.033l5.443-1.361c.175-.044.342-.138.475-.271l8.736-8.736c.566-.566.566-1.486 0-2.052l-3.276-3.276c-.566-.566-1.486-.566-2.052 0l-8.736 8.736c-.133.133-.227.3-.271.475l-1.361 5.443c-.067.269-.011.549.153.713zm8.555-12.254l4.192 4.192-1.009 1.01-4.192-4.193 1.009-1.009zm-6.552 8.562l1.039-4.155 3.117 3.117-4.156 1.038z"/>
                </svg>
              </div>
              <p className="text-gray-600 italic mb-6">"Highly recommend to anyone looking for financial advice. The budget alerts have prevented me from overspending many times!"</p>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 font-bold">N</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Neha</p>
                  <p className="text-sm text-gray-500">Financial Analyst</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-xl font-bold mb-4">SmartWealth Finance</h4>
              <p className="text-blue-200">Your intelligent financial companion powered by AI technology.</p>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/about"><span className="text-blue-200 hover:text-white transition duration-300">About Us</span></Link></li>
                <li><Link href="/login"><span className="text-blue-200 hover:text-white transition duration-300">Login</span></Link></li>
                <li><Link href="/signup"><span className="text-blue-200 hover:text-white transition duration-300">Sign Up</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-4">Contact</h4>
              <p className="text-blue-200">support@smartwealth.com</p>
              <p className="text-blue-200 mt-2">+1 (800) 123-4567</p>
            </div>
          </div>
          <div className="border-t border-blue-700 pt-6 text-center">
            <p>© 2025 SmartWealth Finance. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}