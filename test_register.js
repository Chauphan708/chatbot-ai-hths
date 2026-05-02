async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Origin": "http://localhost:5173" // Better Auth requires Origin or Referer for CSRF protection
      },
      body: JSON.stringify({
        email: "testlocal2@gmail.com",
        password: "Password123!",
        name: "Test User",
        role: "teacher"
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();
