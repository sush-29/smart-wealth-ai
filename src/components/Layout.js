// components/Layout.js
import Head from "next/head";

export default function Layout({ title, children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Head>
        <title>{title}</title>
      </Head>
      <main className="w-full max-w-3xl p-6 bg-white rounded-lg shadow-lg">
        {children}
      </main>
    </div>
  );
}
