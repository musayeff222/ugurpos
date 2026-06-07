import app from "./server/app.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`UgurPOS running on port ${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("Login: admin@benimpos.com / admin123");
  }
});

export default app;
