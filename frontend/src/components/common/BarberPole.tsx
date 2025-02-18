import React from "react";

import styles from "./BarberPole.module.scss";

const BarberPole: React.FC<{ speed?: string }> = ({ speed = "3s" }) => {
  return (
    <div className={`${styles["barber-pole"]} barber-pole`}>
      <div
        className={`${styles["stripes"]} stripes`}
        style={{ animationDuration: speed }}
      ></div>
    </div>
  );
};

export default BarberPole;
