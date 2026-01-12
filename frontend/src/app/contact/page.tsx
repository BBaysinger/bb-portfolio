"use client";
import clsx from "clsx";
import React, { useState } from "react";

import styles from "./ContactPage.module.scss";

/**
 * Contact page.
 *
 * Provides a simple client-rendered contact form and POSTs submissions to
 * `POST /api/contact/`.
 *
 * Notes:
 * - The `/api` prefix is expected to be rewritten to the backend (see Next.js
 *   rewrites / proxy config).
 * - A trailing slash is intentionally included in the fetch URL to avoid a 308
 *   redirect when `trailingSlash: true` is enabled.
 * - Client-side validation is intentionally minimal; the backend remains the
 *   source of truth for validation and sending (SES).
 */
const ContactPage = () => {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    message: string;
  }>({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset any prior UI state as soon as the user starts editing again.
    if (errorMessage) setErrorMessage("");
    if (status) setStatus("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("Sending...");
    setErrorMessage("");
    setIsLoading(true);

    // Client-side validation
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      setErrorMessage("Please fill in all fields.");
      setStatus("");
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      setStatus("");
      setIsLoading(false);
      return;
    }

    try {
      // Use a relative path so Next.js rewrites can route `/api` to the backend.
      // Include a trailing slash to avoid a 308 redirect when `trailingSlash: true`.
      const response = await fetch(`/api/contact/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        // Backend returns a friendly status message on success.
        setStatus(result.message || "Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      } else {
        // Normalize backend error payloads into thrown errors for a single catch path.
        throw new Error(result.error || "Form submission failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again later.";
      setErrorMessage(errorMessage);
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  // Single computed status message for display
  const isError = Boolean(errorMessage);
  const statusText = errorMessage || status || "\u00A0"; // keep layout height when idle

  return (
    <>
      <div className={styles.contactPage}>
        <div>
          <h1>
            <span>Let's</span> <span>Connect</span>
          </h1>
          <p>
            Have a project in mind or just want to say hello? Drop me a message,
            and I&apos;ll get back to you as soon as possible!
          </p>
          <form onSubmit={handleSubmit}>
            <div className={styles.sameRow}>
              <label className={styles.adjacent}>
                <div>Name:</div>
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </label>
              <label className={styles.adjacent}>
                <div>Email:</div>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </label>
            </div>
            <label>
              <div>Message:</div>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </label>
            <div className={styles.buttonRow}>
              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send"}
              </button>
              <span
                className={clsx(
                  styles.message,
                  styles.statusMessage,
                  isError && styles.errorMessage,
                )}
              >
                {statusText}
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
