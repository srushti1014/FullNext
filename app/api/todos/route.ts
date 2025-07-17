import { NextRequest, NextResponse } from "next/server";
import { auth, getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const ITEMS_PER_PAGE = 10;

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  console.log("HERE IS AUTH",userId);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url); //new URL(req.url) creates a URL object from the string. This is a built-in JavaScript class that lets you easily access parts of the URL like: pathname: /api/tasks

  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";

  try {
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
    });

    const totalItems = await prisma.todo.count({
      where: {
        userId,
        title: {
          contains: "search",
          mode: "insensitive",
        },
      },
    });
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return NextResponse.json({
      todos,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { todos: true }, //basically join operation
  });
  console.log("User:", user);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.isSubscribed && user.todos.length >= 3) {
    return NextResponse.json(
      {
        error:
          "Free users can only create up to 3 todos. Please subscribe for more.",
      },
      { status: 403 }
    );
  }

  const { title } = await req.json(); //In express we used to parsed by middleware like express.json()

  const todo = await prisma.todo.create({
    data: { title, userId },
  });

  return NextResponse.json(todo, { status: 201 });
}
