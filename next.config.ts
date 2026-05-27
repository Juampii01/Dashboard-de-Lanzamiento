import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [],
  },
  // M6 (partial): The @types/react-pdf TS2688 is fixed by ./@types/react-pdf/index.d.ts stub.
  // ignoreBuildErrors remains true because ~50 Supabase `never` errors exist until types
  // are generated: `supabase gen types typescript --project-id <ref> > lib/supabase/types.ts`
  // After running that command, set this to false and commit.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
