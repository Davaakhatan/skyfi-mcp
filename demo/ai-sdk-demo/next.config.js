const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@config': path.resolve(__dirname, '../../src/config'),
      '@services': path.resolve(__dirname, '../../src/services'),
      '@models': path.resolve(__dirname, '../../src/models'),
      '@repositories': path.resolve(__dirname, '../../src/repositories'),
      '@utils': path.resolve(__dirname, '../../src/utils'),
      '@auth': path.resolve(__dirname, '../../src/auth'),
      '@sse': path.resolve(__dirname, '../../src/sse'),
    };
    return config;
  },
};

module.exports = nextConfig;

