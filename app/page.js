"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

export default function HomePage() {
  const [receiverNumber, setReceiverNumber] = useState("");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const numberCount = useMemo(() => {
    return receiverNumber
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean).length;
  }, [receiverNumber]);

  const summary = useMemo(() => {
    if (!results) return null;
    const success = results.filter((r) => r.status === "Success").length;
    const failed = results.filter((r) => r.status === "Failed").length;
    const invalid = results.filter((r) => r.status === "Invalid number").length;
    return { success, failed, invalid, total: results.length };
  }, [results]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResults(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverNumber, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Something went wrong while sending SMS.");
        return;
      }

      setResults(data.results || []);
      setReceiverNumber("");
      setMessage("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="page-inner">

        {/* ── Form card ── */}
        <div className="card">
          <h1 className="app-title">ATTAFUAH PTA USMS</h1>

          <div className="logo-wrapper">
            <Image
              src="/attefuah.jpg"
              alt="ATTAFUAH PTA logo"
              width={120}
              height={120}
              className="app-logo"
              priority
            />
          </div>

          <p className="app-subtitle">Send SMS</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <div className="label-row">
                <label htmlFor="receiver_number">Customer Numbers</label>
                {numberCount > 0 && (
                  <span className="number-count">
                    {numberCount} number{numberCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <textarea
                id="receiver_number"
                name="receiver_number"
                rows={6}
                placeholder={
                  "Enter numbers separated by commas or new lines:\n0554567890, 0241234567\n0271234567\n0301234567"
                }
                required
                value={receiverNumber}
                onChange={(e) => setReceiverNumber(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Enter your message here..."
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button type="submit" className="send-btn" disabled={isLoading}>
              {isLoading
                ? `Sending to ${numberCount} number${numberCount !== 1 ? "s" : ""}…`
                : "Send SMS"}
            </button>
          </form>
        </div>

        {/* ── Results card ── */}
        {summary && (
          <>
            <div className="section-gap" />
            <div className="card">
              <p className="results-title">SMS Results</p>

              <div className="summary-bar">
                <span className="summary-item summary-total">
                  Total: {summary.total}
                </span>
                {summary.success > 0 && (
                  <span className="summary-item summary-success">
                    ✓ Sent: {summary.success}
                  </span>
                )}
                {summary.failed > 0 && (
                  <span className="summary-item summary-failed">
                    ✗ Failed: {summary.failed}
                  </span>
                )}
                {summary.invalid > 0 && (
                  <span className="summary-item summary-invalid">
                    ⚠ Invalid: {summary.invalid}
                  </span>
                )}
              </div>

              {results.map((result, index) => {
                const statusClass =
                  result.status === "Success"
                    ? "success"
                    : result.status === "Failed"
                      ? "failed"
                      : "invalid";
                const statusText =
                  result.status === "Success"
                    ? "Sent successfully"
                    : result.status === "Failed"
                      ? "Failed to send"
                      : "Invalid number";

                return (
                  <div className="result" key={`${result.phone}-${index}`}>
                    <span className="result-phone">{result.phone}</span>
                    <span className={statusClass}>{statusText}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
