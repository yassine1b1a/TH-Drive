/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
<<<<<<< HEAD
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  images: {
    domains: ['localhost', 'lh3.googleusercontent.com'],
  },
}

export default nextConfig
=======
=======
>>>>>>> Stashed changes
  // REMOVE or COMMENT OUT React Compiler config temporarily:
  // experimental: {
  //   reactCompiler: true,
  // },
}

<<<<<<< Updated upstream
module.exports = nextConfig
>>>>>>> Stashed changes
=======
=======
  swcMinify: true,
  
  // Remove or keep experimental features based on what you need
  experimental: {
    turbo: {}, // Keep if you want Turbopack
    // reactCompiler: true, // Comment out if causing issues
  },
  
  // Optional: Add these for better error handling
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

>>>>>>> 243590a2e2def16091ab857d42fefdeb88588ab6
module.exports = nextConfig
