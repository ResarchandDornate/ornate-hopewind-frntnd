// `standalone` emits .next/standalone with a self-contained server.js and only
// the node_modules actually imported — that is what the Dockerfile copies into
// the runner stage, and it is how every other portal on this host is built.
// Without it there is no .next/standalone directory and the image build fails.
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
