import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AuthShowcase } from "../components/auth-showcase";
import { CreateNote } from "../components/create-note";
import { Notes } from "../components/notes";
import { notesQueryOptions } from "../queries/notes.queries";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const notesQuery = useQuery(notesQueryOptions());

  return (
    <div className="p-2 flex flex-col gap-4 items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-lg animate-fade-in">
          Welcome to{" "}
          <span className="underline decoration-wavy decoration-4 decoration-pink-400">
            Reno Stack
          </span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-300 text-center max-w-xl">
          The modern, efficient, and{" "}
          <span className="font-semibold text-primary">fun</span> stack for your
          next project. <span className="inline-block text-white">🚀</span>
        </p>
        <AuthShowcase />
      </div>
      <CreateNote />
      {notesQuery.data && <Notes notes={notesQuery.data} />}
    </div>
  );
}
