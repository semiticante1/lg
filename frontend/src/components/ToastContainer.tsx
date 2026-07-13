import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import type { ToastMessage } from "../types/app";

interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ messages, onRemove }: ToastContainerProps) {
  return (
    <>
      {messages.map((toast, idx) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          autoHideDuration={4000}
          onClose={() => onRemove(toast.id)}
          sx={{ mt: `${idx * 6}px` }}
        >
          <Alert
            onClose={() => onRemove(toast.id)}
            severity={toast.type as "success" | "error" | "info" | "warning"}
            variant="filled"
          >
            <strong style={{ display: "block" }}>{toast.title}</strong>
            <div>{toast.message}</div>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
