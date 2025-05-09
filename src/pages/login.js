import { useRouter } from "next/router";
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  console.log("Login component loaded");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard"); // Redirect to dashboard after successful login
    }
  };

  return (
    <div className="min-h-screen flex flex-col auth-bg">
      <nav className="bg-gray-600 text-white py-2 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/Smart.png"
            alt="Smart Wealth Logo"
            width={50}
            height={50}
          />
          <span className="ml-2 text-lg font-bold">AI Finance Platform</span>
        </div>
        <div>
          <Link href="/">
            <span className="text-white mx-2 cursor-pointer hover:underline">Home</span>
          </Link>
          <Link href="/signup">
            <span className="text-white mx-2 cursor-pointer hover:underline">Sign Up</span>
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center flex-grow">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-center text-gray-900">Login</h2>
          {error && <p className="text-red-500 text-center mt-2">{error}</p>}
          <form onSubmit={handleLogin} className="mt-6">
            <div className="mb-4">
              <label className="block text-gray-700 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:ring focus:ring-blue-300"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:ring focus:ring-blue-300"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}