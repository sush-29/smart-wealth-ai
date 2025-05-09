import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-6">About Us</h1>
        <p className="text-lg text-gray-700 mb-4">
          Welcome to AI Finance Platform, your one-stop solution for AI-driven financial insights. Our mission is to empower individuals and businesses with advanced financial tools and insights powered by artificial intelligence.
        </p>
        <p className="text-lg text-gray-700 mb-4">
          Our platform offers a range of features designed to help you make informed financial decisions, track your transactions, and achieve your financial goals. With a user-friendly interface and cutting-edge technology, we strive to provide the best financial experience for our users.
        </p>
        <p className="text-lg text-gray-700 mb-4">
          Thank you for choosing AI Finance Platform. We are committed to helping you succeed in your financial journey.
        </p>
        <div className="text-center mt-6">
          <Link href="/">
            <span className="text-blue-600 hover:underline cursor-pointer">Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}