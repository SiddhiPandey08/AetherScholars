import { FaTrash } from 'react-icons/fa';

export default function Home() {
  return (
    <main>
      <img src="/images/hero-library.jpg" className="hero" />
      <input type="email" id="email" name="email" />
      <button className="btn-delete" onClick={remove}><FaTrash /></button>
      <a href="/profile" className="avatar-link"><img src="/avatar-default.png" alt="" /></a>
    </main>
  );
}
