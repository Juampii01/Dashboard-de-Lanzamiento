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
  // Security headers — defensa en profundidad (clickjacking, sniffing, referrer).
  // HSTS lo agrega Vercel automáticamente en producción.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
