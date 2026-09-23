/**
 * The one page this server renders.
 *
 * It stands where an identity provider's login screen would, and asks for the
 * only credential the user actually has: their Integra API key. Everything
 * around it — the OAuth dance, the token, the refresh — exists so that Claude's
 * connector dialog, which offers OAuth and nothing else, can be pointed at a
 * server authenticated by an API key.
 *
 * Self-contained markup with inline styles. This process has no static file
 * route, no build step for assets and no framework, and adding any of those to
 * serve one form would be a poor trade. The palette matches the dashboard so
 * the page does not read as a different company's.
 */

const BRAND = {
  bg: "#0a0a0a",
  panel: "#141414",
  border: "#262626",
  text: "#f5f5f5",
  muted: "#a3a3a3",
  accent: "#30d394",
  danger: "#f87171",
};

const ICON = "https://dashboard.integramarkets.app/integra-icon.png";
const KEYS_URL = "https://dashboard.integramarkets.app/account/api";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface AuthorizeFormParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  resource: string;
}

/**
 * The form. Every OAuth parameter rides along in a hidden field rather than
 * being held server-side between the GET and the POST — same reason the codes
 * are sealed blobs: there is no session here to put them in, and inventing one
 * would make this the only stateful thing in the process.
 */
export function authorizePage(params: AuthorizeFormParams, error?: string): string {
  const hidden = Object.entries({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    state: params.state,
    code_challenge: params.codeChallenge,
    resource: params.resource,
  })
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${name}" value="${escapeHtml(value ?? "")}">`
    )
    .join("\n      ");

  const errorBlock = error
    ? `<p class="error" role="alert">${escapeHtml(error)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Connect Integra Markets</title>
<link rel="icon" href="${ICON}">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 24px;
    background: ${BRAND.bg}; color: ${BRAND.text};
    font: 15px/1.55 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .card {
    width: 100%; max-width: 420px; padding: 32px;
    background: ${BRAND.panel}; border: 1px solid ${BRAND.border}; border-radius: 16px;
  }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .brand img { width: 32px; height: 32px; border-radius: 8px; }
  .brand span { font-weight: 600; }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  p.lede { margin: 0 0 24px; color: ${BRAND.muted}; font-size: 14px; }
  label { display: block; margin-bottom: 8px; font-size: 13px; color: ${BRAND.muted}; }
  input[type=password], input[type=text] {
    width: 100%; padding: 12px 14px; border-radius: 10px;
    border: 1px solid ${BRAND.border}; background: ${BRAND.bg}; color: ${BRAND.text};
    font: 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  input:focus-visible { outline: 2px solid ${BRAND.accent}; outline-offset: 1px; }
  button {
    width: 100%; margin-top: 20px; padding: 12px 16px; border: 0; border-radius: 10px;
    background: ${BRAND.accent}; color: #04150e; font-size: 15px; font-weight: 600;
    cursor: pointer;
  }
  button:hover { opacity: .92; }
  .error {
    margin: 0 0 20px; padding: 12px 14px; border-radius: 10px;
    border: 1px solid ${BRAND.danger}; color: ${BRAND.danger}; font-size: 13px;
  }
  .foot { margin-top: 20px; font-size: 13px; color: ${BRAND.muted}; }
  .foot a { color: ${BRAND.accent}; }
</style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <img src="${ICON}" alt="">
      <span>Integra Markets</span>
    </div>

    <h1>Connect your account</h1>
    <p class="lede">
      Paste an Integra API key to give Claude access to your data. The key is
      exchanged for a token held by Claude — revoke it any time from your
      dashboard and this connection stops working.
    </p>

    ${errorBlock}

    <form method="post" action="/authorize">
      ${hidden}
      <label for="api_key">API key</label>
      <input
        id="api_key" name="api_key" type="password" required autofocus
        autocomplete="off" spellcheck="false" placeholder="ik_live_…"
      >
      <button type="submit">Connect</button>
    </form>

    <p class="foot">
      No key yet? Create one at <a href="${KEYS_URL}">your dashboard</a>.
    </p>
  </main>
</body>
</html>`;
}

/** Shown when the request itself is malformed, so there is nowhere safe to redirect. */
export function authorizeErrorPage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Cannot connect</title>
<link rel="icon" href="${ICON}">
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 24px; background: ${BRAND.bg};
    color: ${BRAND.text}; font: 15px/1.55 ui-sans-serif, -apple-system, sans-serif;
  }
  .card {
    max-width: 420px; padding: 32px; background: ${BRAND.panel};
    border: 1px solid ${BRAND.border}; border-radius: 16px;
  }
  h1 { margin: 0 0 12px; font-size: 18px; }
  p { margin: 0; color: ${BRAND.muted}; font-size: 14px; }
  a { color: ${BRAND.accent}; }
</style>
</head>
<body>
  <main class="card">
    <h1>Cannot complete the connection</h1>
    <p>${escapeHtml(message)}</p>
    <p style="margin-top:16px">
      Start again from <a href="https://dashboard.integramarkets.app/mcp">the setup page</a>.
    </p>
  </main>
</body>
</html>`;
}
