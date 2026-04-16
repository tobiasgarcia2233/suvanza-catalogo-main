import { NextResponse } from "next/server";
import {
  createSession,
  setSessionCookie,
  verifyCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    const ok = await verifyCredentials(username, password);
    if (!ok) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }

    const token = await createSession(username);
    await setSessionCookie(token);
    return NextResponse.json({ message: "ok" });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
