import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";

export async function GET() {
  try {
    const result = await turso.execute("SELECT 1 as ok");

    return NextResponse.json({
      success: true,
      result: result.rows,
    });
  } catch (error) {
    console.error("Turso test failed", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}