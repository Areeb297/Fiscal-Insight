import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

router.post("/auth/signup", async (req, res): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    if (!CLERK_SECRET_KEY) {
      res.status(500).json({ error: "Auth service is not configured" });
      return;
    }

    const clerkRes = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [email],
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        skip_password_checks: true,
        skip_password_requirement: false,
      }),
    });

    const data = await clerkRes.json() as any;
    if (!clerkRes.ok || data.errors) {
      const msg = data?.errors?.[0]?.long_message || data?.errors?.[0]?.message || "Signup failed";
      res.status(400).json({ error: msg });
      return;
    }

    res.status(201).json({
      id: data.id,
      email: data.email_addresses?.[0]?.email_address,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Signup error" });
  }
});

export default router;
