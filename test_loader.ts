import { getAdjacentUpdates } from "./src/server/queries";

async function main() {
  const result = await (getAdjacentUpdates as any)({ data: { slug: "show-hn-agenttriage-diagnosis-of-agent-failures-from-product-45f1c7" } });
  console.log("Adjacency result:", result);
}
main().catch(console.error).finally(() => process.exit(0));
