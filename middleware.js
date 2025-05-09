// pages/_middleware.js
import { NextResponse } from "next/server";
import { supabase } from "./utils/supabaseClient";

export async function middleware(req) {
  const { data } = await supabase.auth.getUser();

  // Prevent redirecting if the user is already on the login page
  if (req.url.includes("/login")) {
    return NextResponse.next();  // Don't redirect if already on login page
  }

  if (!data?.user) {
    return NextResponse.redirect(new URL("/login", req.url));  // Redirect if not authenticated
  }
  
  return NextResponse.next();  // Allow other requests to pass
}
