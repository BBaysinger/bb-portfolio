"use client";
import clsx from "clsx";
import React, { useState } from "react";

import styles from "./ContactPage.module.scss";

/**
 * Contact page with AWS SES email integration
 *
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
  const [error, setError] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
    if (status) setStatus("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("Sending...");
    setError("");

    // Client-side validation
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.message.trim()
    ) {
      setError("Please fill in all fields.");
      setStatus("");
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      setStatus("");
      return;
    }

    try {
      // Use relative path to leverage Next.js rewrites (/api -> backend)
      // Include trailing slash to avoid 308 redirect due to Next.js trailingSlash: true
      const response = await fetch(`/api/contact/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(result.message || "Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error(result.error || "Form submission failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again later.";
      setError(errorMessage);
      setStatus("");
    }
  };

  // Single computed status message for display
  const isError = Boolean(error);
  const statusText = error || status || "\u00A0"; // keep layout height when idle

  return (
    <>
      <div className={`${styles.contactPage}`}>
        <div>
          <h1>Let's Connect</h1>
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
            <button type="submit">Send</button>
          </form>
          <p
            className={clsx(
              styles.message,
              styles.statusMessage,
              isError && styles.errorMessage,
            )}
          >
            {statusText}
          </p>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
