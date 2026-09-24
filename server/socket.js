export function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("board:join", (boardId) => {
      if (typeof boardId === "string") {
        socket.join(boardId);
      }
    });

    socket.on("board:leave", (boardId) => {
      if (typeof boardId === "string") {
        socket.leave(boardId);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
