import React from "react";

import styles from "./BarberPole.module.scss";

const BarberPole: React.FC<{ className: string }> = ({ className }) => {
  return (
    <div className={`${styles["barber-pole"]} ${className}`}>
      <div className={`${styles["stripes"]} stripes`}></div>
    </div>
  );
};

export default BarberPole;
