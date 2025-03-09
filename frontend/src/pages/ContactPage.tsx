import React, { useState } from "react";

import styles from "./ContactPage.module.scss";

/**
 * Obligatory contact page!
 *
 * https://www.netlify.com/blog/2017/07/20/how-to-integrate-netlifys-form-handling-in-a-react-app/
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
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

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/", {
        method: "POST",
        body: new URLSearchParams(data as any).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (response.ok) {
        setStatus("Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error("Form submission failed");
      }
    } catch (error) {
      setError("Failed to send message. Please try again later.");
      setStatus("");
    }
  };

  return (
    <>
      <div id="mainContent" className={`${styles["contact-page"]}`}>
        <div className={`container`}>
          <div className={`${styles["form"]} row`}>
            <h1>Contact me!</h1>
            <p>
              Have a project in mind or just want to say hello? Drop me a
              message, and I'll get back to you as soon as possible!
            </p>
            <form
              name="contact"
              action="/"
              data-netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value="contact" />
              <input type="hidden" name="bot-field" />{" "}
              <label>
                <div>Name:</div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                <div>Email:</div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </label>
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
            {status && <p className={styles.successMessage}>{status}</p>}
            {error && <p className={styles.errorMessage}>{error}</p>}
            {!status && !error && <p className={styles.preventShift}>.</p>}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
