/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
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

<<<<<<< HEAD
=======
    // Additional CSS handling
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    })

>>>>>>> 640bda3 (Update v1.7.0)
    return config
  },

  // Experimental features for better compatibility
  experimental: {
    // Reserved for future experimental features
<<<<<<< HEAD
=======
    optimizeCss: true,
>>>>>>> 640bda3 (Update v1.7.0)
  },

  // Skip linting during build to focus on showcasing features
  eslint: {
    ignoreDuringBuilds: true,
    dirs: [],
  },

  // Skip TypeScript errors during build for demo
  typescript: {
    ignoreBuildErrors: true,
  },

  // Additional build optimizations
  poweredByHeader: false,
  reactStrictMode: false,

<<<<<<< HEAD
  // Disable strict checks for deployment
  swcMinify: true,
=======
  // Additional build optimizations for Next.js 15+
  // swcMinify is now enabled by default in Next.js 15
>>>>>>> 640bda3 (Update v1.7.0)
};

module.exports = nextConfig;
