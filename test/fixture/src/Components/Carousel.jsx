import styles from './styles.module.css';

export default function Carousel({ slides, active, go }) {
  return (
    <div>
      {slides.map((s, i) => (
        <button key={s.id} className={`${styles.dot} ${i === active ? styles.activeDot : ''}`} onClick={() => go(i)}></button>
      ))}
    </div>
  );
}
