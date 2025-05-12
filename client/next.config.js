/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_ZEGO_APP_ID: 1488067480,
    NEXT_PUBLIC_ZEGO_SERVER_ID: "959c8fe0ab98ab69156555e7e52aa8bf",
  },
 images: {
  domains: [
    "localhost", 
    "res.cloudinary.com", 
    "your-backend.onrender.com"
  ],
},
};

module.exports = nextConfig;
