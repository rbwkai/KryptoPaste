import Create from './Create.jsx';
import Read from './Read.jsx';

const READ_ROUTE = /^\/p\/([A-Za-z0-9_-]{22})\/?$/;

export default function App() {
  const match = READ_ROUTE.exec(location.pathname);

  return (
    <div className="shell">
      <header>
        <a className="brand" href="/">
          Krypto<span>Paste</span>
        </a>
      </header>

      <main className="content">
        {match ? <Read id={match[1]} /> : <Create />}
      </main>

      <footer className="foot">
        <span>
          Encrypted in your browser. The server never sees your text or key.
        </span>
        <span>Open source · MIT</span>
      </footer>
    </div>
  );
}
