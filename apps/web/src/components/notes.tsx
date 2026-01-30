import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { InferResponseType } from "hono";
import { client } from "../utils/hono-client";

export const Notes = ({
  notes,
}: {
  notes: InferResponseType<typeof client.notes.$get, 200>;
}) => {
  return notes.map((note) => (
    <Card
      key={note.id}
      className="w-full max-w-2xl shadow-md hover:shadow-lg transition-shadow bg-transparent text-white border-zinc-600"
    >
      <CardHeader>
        <CardTitle className="text-xl font-bold">{note.title}</CardTitle>
        <CardDescription className="mt-2 text-gray-300">
          {note.content}
        </CardDescription>
      </CardHeader>
      <CardFooter className="text-sm text-gray-300 flex justify-between items-center border-t border-zinc-600 pt-3">
        <span>Created by: {note.creatorName}</span>
        {note.isOwner && (
          <span className="text-blue-500 text-xs font-medium">
            You are the owner
          </span>
        )}
      </CardFooter>
    </Card>
  ));
};
