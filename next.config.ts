import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server (e.g. http://<LAN-IP>:3000/u/<token>).
  allowedDevOrigins: ["192.168.0.2", "*.local"],
};

export default nextConfig;
