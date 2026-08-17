/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * www → apex, permanently.
   *
   * IMPORTANT about what this can and cannot do: this rule runs inside the
   * app, so the request has to REACH the app first. Today www.heytring.com has
   * no DNS record at all, so a browser fails to connect and nothing here ever
   * executes. Adding the domain in Vercel is still the actual fix.
   *
   * This exists so that the moment www does resolve — because someone adds it,
   * or a registrar/CDN starts answering for it — every path lands on the apex
   * with the canonical URL rather than serving the whole site on a second
   * hostname. Two hostnames serving identical content splits link equity and
   * gives search engines a duplicate to choose between, which is precisely the
   * discoverability problem we are trying to close.
   *
   * 308 (permanent: true) so the redirect is cached and the method is
   * preserved — a 301/302 can turn a POST into a GET, which would silently
   * break the waitlist form for anyone who arrived via www.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.heytring.com" }],
        destination: "https://heytring.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
