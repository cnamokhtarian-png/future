import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/data";
import { runAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ data: await getWorkspace() });
  } catch (error) {
    console.error("Workspace read failed", error);
    return NextResponse.json({ error: "دریافت اطلاعات ممکن نشد. دوباره تلاش کن." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "بدنه درخواست باید JSON معتبر باشد." }, { status: 400 });
    }
    const result = await runAction(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ data: await getWorkspace() });
  } catch (error) {
    console.error("Workspace update failed", error);
    return NextResponse.json({ error: "تغییرات ذخیره نشد؛ اتصال را بررسی کن و دوباره تلاش کن." }, { status: 500 });
  }
}
