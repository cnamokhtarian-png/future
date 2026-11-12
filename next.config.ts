import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg is a native-ish Node module; keep it out of the server bundle.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
