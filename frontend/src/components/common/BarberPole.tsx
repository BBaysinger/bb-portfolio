import React from "react";

import styles from "./BarberPole.module.scss";

const BarberPole: React.FC<{}> = () => {
  return (
    <div className={`${styles["barber-pole"]} barber-pole`}>
      <div className={`${styles["stripes"]} stripes`}></div>
    </div>
  );
};

export default BarberPole;
