import styles from './pager.module.css';

export default function Pager({ items }) {
  return <nav>{items.map((it) => <button key={it} className={styles.indicator} />)}</nav>;
}
