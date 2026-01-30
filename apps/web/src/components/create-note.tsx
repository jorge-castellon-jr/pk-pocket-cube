import { Button } from "@repo/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { toast } from "@repo/ui/toast";
import { createNotesSchema } from "@repo/validators";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createNoteMutationOptions,
  notesQueryOptions,
} from "../queries/notes.queries";

export const CreateNote = () => {
  const form = useForm({
    schema: createNotesSchema,
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const queryClient = useQueryClient();

  const createNoteMutation = useMutation(
    createNoteMutationOptions({
      onError: (error) => {
        if (error.message) {
          // If you check out the type of error, forField is defined as a key of our createNotesSchema
          // So this means we can safely call setError with the forField key
          // Error handling completely up to you but this is a decent start
          form.setError(error.forField, { message: error.message });
        } else {
          // This is for the authentication error
          // Hono RPC doesn't support middleware type inference so we need to cast it to string
          toast.error(error as unknown as string);
        }
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: notesQueryOptions().queryKey,
        });

        form.reset();

        toast.success("Note created successfully");
      },
    })
  );

  return (
    <Form {...form}>
      <span className="text-sm text-zinc-400">
        You can try typing "error" as the title and content to see how errors
        work
      </span>
      <form
        className="flex items-start w-full max-w-2xl gap-2"
        onSubmit={form.handleSubmit((data) => createNoteMutation.mutate(data))}
      >
        <div className="flex flex-col w-full gap-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel />
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Title"
                    {...field}
                    className="bg-transparent text-white border-zinc-600 placeholder:text-zinc-400"
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel />
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Content"
                    {...field}
                    className="bg-transparent text-white border-zinc-600 placeholder:text-zinc-400"
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={createNoteMutation.isPending}
          className="opacity-100 disabled:opacity-60"
        >
          Create Note
        </Button>
      </form>
    </Form>
  );
};
