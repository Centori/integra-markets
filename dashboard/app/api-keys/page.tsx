// Keys moved into account settings — /account/api is the single page for
// subscription, keys, and the MCP connector. Kept as a redirect so old
// links, emails, and the iOS app deep link keep working.

import { redirect } from "next/navigation";

export default function ApiKeysPage() {
  redirect("/account/api");
}
