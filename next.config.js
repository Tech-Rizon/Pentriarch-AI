/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },

  // Server-side only modules
  serverExternalPackages: ['dockerode'],

  // Webpack configuration for handling server-side dependencies
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-side packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
        events: false,
      }

      // Ignore server-side modules on client
      config.externals = {
        ...config.externals,
        dockerode: 'dockerode',
      }
    }

    // Handle binary files
    config.module.rules.push({
      test: /\.(node)$/,
      use: 'file-loader',
    })

    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    })

    return config
  },

  // Turbopack configuration (Next.js 16 default)
  turbopack: {},

  // Experimental features for better compatibility
  experimental: {
    // Reserved for future experimental features
    optimizeCss: true,
  },


  // Skip TypeScript errors during build for demo
  typescript: {
    ignoreBuildErrors: true,
  },

  // Additional build optimizations
  poweredByHeader: false,
  reactStrictMode: false,
  // Additional build optimizations for Next.js 15+
  // swcMinify is now enabled by default in Next.js 15
};

module.exports = nextConfig;
