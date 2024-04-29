import "./index.css";
import App from "./App";
import ReactDOM from "react-dom/client";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";
import { RootContextProvider } from "./contexts/RootContext/RootContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <RootContextProvider>
    <App />

    <ToastContainer
      position="bottom-right"
      autoClose={5000}
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
    />
  </RootContextProvider>
);
