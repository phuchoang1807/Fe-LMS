import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

export default function Layout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">
        <Header />
        <main className="app__container">{children}</main>
      </div>
    </div>
  );
}