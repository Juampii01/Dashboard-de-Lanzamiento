import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [],
  },
  // TODO: eliminar cuando se conecte Supabase real y se generen tipos con
  // `supabase gen types typescript --project-id <ref> > lib/supabase/types.ts`
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
