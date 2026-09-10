import * as React from "react";
import styles from "./RoutePlaceholder.module.scss";

export interface IRoutePlaceholderProps {
  title: string;
  description: string;
}

const RoutePlaceholder: React.FC<IRoutePlaceholderProps> = ({
  title,
  description,
}) => (
  <section className={styles.placeholder}>
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.description}>{description}</p>
    <p className={styles.note}>
      Screen content will be implemented in the next development phase.
    </p>
  </section>
);

export default RoutePlaceholder;
