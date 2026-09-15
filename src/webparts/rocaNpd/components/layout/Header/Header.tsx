import * as React from "react";
import { Config } from "../../../../../External/CommonServices/Config";
import logoUrl from "../../../assets/RocaNewLogo.jpg";
import styles from "./Header.module.scss";

const Header: React.FC = () => (
  <header className={styles.header}>
    <div className={styles.headerContent}>
      <h1 className={styles.title}>{Config.HeaderTitle}</h1>
      <div className={styles.logoWrap}>
        <img
          className={styles.logo}
          src={logoUrl}
          alt="ROCA Group — Laufen, Roca, Parryware"
        />
      </div>
    </div>
  </header>
);

export default Header;
