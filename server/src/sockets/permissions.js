export const roleName = (role) => String(role || "").toUpperCase();

export const isHost = (role) => role === "host";

export const canControl = (role) => role === "host" || role === "moderator";

export const permissionError = (socket, message, code = "FORBIDDEN") => {
  socket.emit("permission_error", { message, code });
};
