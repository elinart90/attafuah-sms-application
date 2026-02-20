// Increase Vercel function timeout to 60s (requires Pro plan; on Hobby it caps at 10s)
export const maxDuration = 60;

const SMS_API_URL = "https://api.smsonlinegh.com/v5/message/sms/send";
const BATCH_SIZE = 50;

function isValidPhoneNumber(number) {
  return /^\d{9,15}$/.test(number);
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function sendBatch(numbers, message, apiKey, senderId) {
  const response = await fetch(SMS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `key ${apiKey}`,
    },
    body: JSON.stringify({
      text: message,
      type: 0,
      sender: senderId,
      destinations: numbers,
    }),
  });

  const data = await response.json();

  const overallSuccess =
    response.ok &&
    data?.handshake?.id === 0 &&
    data?.handshake?.label === "HSHK_OK";

  if (overallSuccess && Array.isArray(data?.data?.destinations)) {
    const returnedMap = {};
    for (const dest of data.data.destinations) {
      returnedMap[dest.to] = dest.status?.label ?? "";
    }

    return numbers.map((number) => {
      const normalised = number.startsWith("0")
        ? "233" + number.slice(1)
        : number;
      const label = returnedMap[normalised] ?? returnedMap[number] ?? "";
      const status =
        label.startsWith("DS_PENDING") || label.startsWith("DS_SUBMIT")
          ? "Success"
          : "Failed";
      return { phone: number, status };
    });
  }

  // Whole batch failed
  return numbers.map((number) => ({ phone: number, status: "Failed" }));
}

export async function POST(request) {
  try {
    const { receiverNumber, message } = await request.json();

    if (!receiverNumber || !message) {
      return Response.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.USMS_API_KEY;
    const senderId = process.env.USMS_SENDER_ID || "ADEPAPARCEL";

    if (!apiKey) {
      return Response.json(
        { error: "Server is missing USMS_API_KEY environment variable." },
        { status: 500 },
      );
    }

    // Accept numbers separated by commas, newlines, or both
    const allNumbers = receiverNumber
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (allNumbers.length === 0) {
      return Response.json(
        { error: "No phone numbers were provided." },
        { status: 400 },
      );
    }

    // Separate valid and invalid numbers
    const validNumbers = [];
    const invalidResults = [];

    for (const number of allNumbers) {
      if (isValidPhoneNumber(number)) {
        validNumbers.push(number);
      } else {
        invalidResults.push({ phone: number, status: "Invalid number" });
      }
    }

    if (validNumbers.length === 0) {
      return Response.json({ results: invalidResults }, { status: 200 });
    }

    // Split into batches of BATCH_SIZE and run all batches in parallel
    const batches = chunkArray(validNumbers, BATCH_SIZE);

    const batchResults = await Promise.all(
      batches.map((batch) =>
        sendBatch(batch, message, apiKey, senderId).catch(() =>
          batch.map((number) => ({ phone: number, status: "Failed" })),
        ),
      ),
    );

    const apiResults = batchResults.flat();

    return Response.json(
      { results: [...apiResults, ...invalidResults] },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }
}
