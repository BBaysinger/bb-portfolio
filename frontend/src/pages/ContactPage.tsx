import React, { useState } from "react";

import HeaderSub from "components/layout/HeaderSub";
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
      <HeaderSub head={"Contact"} />
      <section className="contact-page">
        <div className={`container`}>
          <div className={`${styles["form"]} row`}>
            <h2>Contact Me</h2>
            <form
              name="contact"
              method="POST"
              data-netlify="true"
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value="contact" />
              <label>
                Name:
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Email:
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Message:
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
      </section>
    </>
  );
};

export default ContactPage;
