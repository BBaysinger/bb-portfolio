import React, { useState } from "react";

import styles from "./ContactPage.module.scss";

/**
 * Contact page that I need to develop...
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("Sending...");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setStatus("Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error("Form submission failed");
      }
    } catch (error) {
      setStatus("Failed to send message. Please try again later.");
    }
  };

  return (
    <>
      <div id="mainContent" className={`${styles["contact-page"]}`}>
        <div className={`container`}>
          <div className={`${styles["form"]} row`}>
            <h1>Contact Me</h1>

            <p>
              Have a project in mind or just want to say hello? Drop me a
              message, and I'll get back to you as soon as possible!
            </p>
            <form
              name="contact"
              method="POST"
              data-netlify="true"
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value="contact" />
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
            {status && <p>{status}</p>}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
