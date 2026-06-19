import type { ToastMessage } from "../types/app";

interface ToastContainerProps {
  messages: ToastMessage[];
}

export default function ToastContainer({ messages }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {messages.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
