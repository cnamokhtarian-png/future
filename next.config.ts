import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg is a native-ish Node module; keep it out of the server bundle.
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
};

export default nextConfig;
