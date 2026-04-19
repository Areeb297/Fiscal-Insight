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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clerkRes: any = await fetch("https://api.clerk.com/v1/users", {
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
        bypass_client_trust: true,
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

const ADMIN_EMAILS_FALLBACK = "areeb.shafqat@ebttikar.com,khalid@ebttikar.com";

function adminEmailList(): string[] {
  return (process.env["ADMIN_EMAILS"] || ADMIN_EMAILS_FALLBACK)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

router.post("/auth/admin-reset", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    if (!adminEmailList().includes(email.toLowerCase())) {
      res.status(403).json({ error: "This endpoint is only available for pre-approved admin emails." });
      return;
    }
    if (!CLERK_SECRET_KEY) {
      res.status(500).json({ error: "Auth service is not configured" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lookup: any = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } },
    );
    const found = (await lookup.json()) as any[];
    let userId: string | undefined = Array.isArray(found) && found[0]?.id;

    if (!userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const create: any = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [email],
          password,
          skip_password_checks: true,
          bypass_client_trust: true,
          public_metadata: { role: "admin" },
        }),
      });
      const createData = (await create.json()) as any;
      if (!create.ok || createData?.errors) {
        const msg = createData?.errors?.[0]?.long_message || createData?.errors?.[0]?.message || "Failed to create user";
        res.status(400).json({ error: msg });
        return;
      }
      userId = createData.id;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const update: any = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          skip_password_checks: true,
          bypass_client_trust: true,
          sign_out_of_other_sessions: true,
          public_metadata: { role: "admin" },
        }),
      });
      const updateData = (await update.json()) as any;
      if (!update.ok || updateData?.errors) {
        const msg = updateData?.errors?.[0]?.long_message || updateData?.errors?.[0]?.message || "Failed to update user";
        res.status(400).json({ error: msg });
        return;
      }
    }

    res.json({ ok: true, id: userId, email });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Admin reset failed" });
  }
});

export default router;
