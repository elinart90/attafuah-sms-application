const BALANCE_API_URL = "https://api.smsonlinegh.com/v5/account/balance";

export async function GET() {
  const apiKey = process.env.USMS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing USMS_API_KEY environment variable." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(BALANCE_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `key ${apiKey}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    const ok =
      response.ok &&
      data?.handshake?.id === 0 &&
      data?.handshake?.label === "HSHK_OK";

    if (ok) {
      return Response.json({ balance: data.data.balance ?? 0 });
    }

    return Response.json(
      { error: "Could not retrieve balance." },
      { status: 502 },
    );
  } catch {
    return Response.json(
      { error: "Network error fetching balance." },
      { status: 502 },
    );
  }
}
